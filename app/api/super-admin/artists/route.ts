import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, paths, upsertArrayFile } from "@/lib/gcs";
import GCSService from "@/lib/google-cloud-storage";
import WebSocketService from "@/lib/websocket-service";
import { broadcastUserStatusUpdate } from "@/app/api/websocket/route";

interface ArtistSummary {
    id: string;
    artistName: string;
    realName?: string;
    email: string;
    phone?: string;
    style?: string;
    eventId: string;
    eventName?: string;
    status?: "pending" | "approved" | "rejected" | "active" | "inactive";
    createdAt?: string;
    lastLogin?: string;
}

export async function GET() {
    try {
        // Load all events
        const allEvents = (await readJsonFile<any[]>(paths.eventsIndex, [])) || [];

        // Collect all artist IDs from each event's index
        const allArtistRefs = (
            await Promise.all(
                allEvents.map(async (evt: any) => {
                    const idx = await readJsonFile<any[]>(
                        paths.artistsIndex(evt.id),
                        []
                    );
                    return (idx || []).map((ref) => ({ ...ref, eventId: evt.id }));
                })
            )
        ).flat();

        // Fetch full artist data for each ref
        const allArtistsData = await Promise.all(
            allArtistRefs.map(async (ref) => {
                const data = await GCSService.getArtistData(ref.id);
                return data ? data : null;
            })
        );

        const allArtists: ArtistSummary[] = allArtistsData
            .filter((a) => a !== null)
            .map((a: any) => ({
                id: a.id,
                artistName: a.artistName,
                realName: a.realName,
                email: a.email,
                phone: a.phone,
                style: a.style,
                eventId: a.eventId,
                eventName: a.eventName,
                status: a.status,
                createdAt: a.createdAt,
                lastLogin: a.lastLogin,
            }));

        return NextResponse.json({
            allArtists,
            totalArtists: allArtists.length,
        });
    } catch (error) {
        console.error("Error fetching artists from GCS:", error);
        return NextResponse.json(
            { error: "Failed to fetch artists" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { action, artistId, status } = await request.json();

        // Load the artist from GCS
        const artistData: any = await GCSService.getArtistData(artistId);
        if (!artistData) {
            return NextResponse.json(
                { error: "Artist not found" },
                { status: 404 }
            );
        }

        const oldStatus: string = artistData.status;

        // Apply action
        switch (action) {
            case "updateStatus":
                artistData.status = status;
                break;
            case "activate":
                artistData.status = "active";
                break;
            case "deactivate":
                artistData.status = "inactive";
                break;
            case "approve":
                artistData.status = "approved";
                break;
            case "reject":
                artistData.status = "rejected";
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }

        artistData.updatedAt = new Date().toISOString();

        // Persist to GCS
        await GCSService.saveArtistData(artistData);

        // Update the event's artist index entry to reflect new status
        if (artistData.eventId) {
            await upsertArrayFile(paths.artistsIndex(artistData.eventId), {
                id: artistData.id,
                artistName: artistData.artistName,
                eventId: artistData.eventId,
                status: artistData.status,
                createdAt: artistData.createdAt,
                performanceDate: null,
            });
        }

        // Notify via WebSocket to super-admin, stage-manager, and artist
        WebSocketService.notifyStatusUpdate(
            artistData,
            oldStatus,
            artistData.status
        );

        // Also notify the specific stage manager over the running WS server
        try {
            const allEvents = (await readJsonFile<any[]>(paths.eventsIndex, [])) || [];
            const evt = allEvents.find((e: any) => String(e.id) === String(artistData.eventId));
            const stageManagerId = evt?.stageManagerId;
            if (stageManagerId) {
                await broadcastUserStatusUpdate(String(stageManagerId), {
                    status: "artist_status_updated",
                    message: `${artistData.artistName} status: ${oldStatus} -> ${artistData.status}`,
                    artistId: artistData.id,
                    eventId: artistData.eventId,
                    oldStatus,
                    newStatus: artistData.status,
                });
            }
        } catch (e) {
            console.error("Stage manager broadcast failed:", e);
        }

        return NextResponse.json({
            message: "Artist status updated successfully",
            artist: {
                id: artistData.id,
                artistName: artistData.artistName,
                email: artistData.email,
                style: artistData.style,
                eventId: artistData.eventId,
                eventName: artistData.eventName,
                status: artistData.status,
                createdAt: artistData.createdAt,
            },
        });
    } catch (error) {
        console.error("Error updating artist in GCS:", error);
        return NextResponse.json(
            { error: "Failed to update artist" },
            { status: 500 }
        );
    }
}
