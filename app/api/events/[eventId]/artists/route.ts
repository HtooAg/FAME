import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import { readJsonFile, writeJsonFile, paths, upsertArrayFile } from "@/lib/gcs";
import { broadcastEventsUpdate } from "@/app/api/websocket/route";
import { Event } from "@/lib/types/event";

interface ArtistData {
  id: string;
  artistName: string;
  realName: string;
  email: string;
  phone: string;
  style: string;
  performanceDuration: number;
  biography: string;
  socialMedia: {
    instagram: string;
    facebook: string;
    youtube: string;
    website: string;
  };
  experience: string;
  equipment: string;
  specialRequirements: string;
  eventId: string;
  eventName: string;
  status: "pending" | "approved" | "rejected" | "active" | "inactive";
  createdAt: string;
  lastLogin?: string;
  profileImage?: string;
  musicSample?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;

    // Read the event to obtain authoritative createdAt for assignDate
    const event = await readJsonFile<Event>(paths.eventFile(eventId));

    // Get artists index from GCS
    const artistsIndex = await readJsonFile(
      paths.artistsIndex(eventId),
      []
    );

    // Get full artist data for each artist in the index
    const eventArtists = await Promise.all(
      artistsIndex.map(async (artistRef: any) => {
        const fullArtistData = await GCSService.getArtistData(artistRef.id);
        return fullArtistData
          ? {
              ...fullArtistData,
              performanceDate: artistRef.performanceDate || null,
              assignDate: event?.createdAt || null,
            }
          : null;
      })
    );

    // Filter out null results
    const validArtists = eventArtists.filter((artist) => artist !== null);

    return NextResponse.json({
      artists: validArtists,
      total: validArtists.length,
      pending: validArtists.filter((a) => a.status === "pending").length,
      approved: validArtists.filter((a) => a.status === "approved").length,
      active: validArtists.filter((a) => a.status === "active").length,
    });
  } catch (error) {
    console.error("Error fetching event artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch artists from Google Cloud Storage" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;
    const { artistId, status } = await request.json();

    // Get current artist data from GCS
    const artistData = await GCSService.getArtistData(artistId);

    if (!artistData || artistData.eventId !== eventId) {
      return NextResponse.json(
        { error: "Artist not found for this event" },
        { status: 404 }
      );
    }

    const oldStatus = artistData.status;

    // Update artist status
    artistData.status = status;
    artistData.updatedAt = new Date().toISOString();

    // Save updated data to GCS
    await GCSService.saveArtistData(artistData);

    // Send real-time notification
    // WebSocketService.notifyStatusUpdate(artistData, oldStatus, status);

    return NextResponse.json({
      message: "Artist status updated successfully",
      artist: artistData,
    });
  } catch (error) {
    console.error("Error updating artist status:", error);
    return NextResponse.json(
      { error: "Failed to update artist status in Google Cloud Storage" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;
    const { musicTracks, galleryFiles, ...artistData } = await request.json();

    // Read event to fetch createdAt as assignDate
    const event = await readJsonFile<Event>(paths.eventFile(eventId));

    // Create new artist with comprehensive data
    const newArtist: any = {
      id: `artist_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      eventId,
      status: "pending",
      createdAt: new Date().toISOString(),
      // Map the comprehensive form data to our storage format
      artistName: artistData.artistName || artistData.artist_name,
      realName: artistData.realName || artistData.real_name,
      email: artistData.email,
      phone: artistData.phone,
      style: artistData.style,
      performanceType:
        artistData.performance_type || artistData.performanceType,
      performanceDuration:
        artistData.performanceDuration ||
        artistData.performance_duration ||
        15,
      biography: artistData.biography,
      experience: artistData.experience || "",
      equipment: artistData.props_needed || "",
      specialRequirements: artistData.notes || "",
      // Technical information
      costumeColor: artistData.costume_color || artistData.costumeColor,
      customCostumeColor:
        artistData.custom_costume_color || artistData.customCostumeColor,
      lightColorSingle:
        artistData.light_color_single || artistData.lightColorSingle,
      lightColorTwo:
        artistData.light_color_two || artistData.lightColorTwo,
      lightColorThree:
        artistData.light_color_three || artistData.lightColorThree,
      lightRequests:
        artistData.light_requests || artistData.lightRequests,
      stagePositionStart:
        artistData.stage_position_start || artistData.stagePositionStart,
      stagePositionEnd:
        artistData.stage_position_end || artistData.stagePositionEnd,
      customStagePosition:
        artistData.custom_stage_position || artistData.customStagePosition,
      // Social media
      socialMedia: {
        instagram:
          artistData.instagram_link ||
          artistData.socialMedia?.instagram ||
          "",
        facebook:
          artistData.facebook_link ||
          artistData.socialMedia?.facebook ||
          "",
        youtube:
          artistData.youtube_link ||
          artistData.socialMedia?.youtube ||
          "",
        tiktok:
          artistData.tiktok_link || artistData.socialMedia?.tiktok || "",
        website:
          artistData.website_link || artistData.socialMedia?.website || "",
      },
      // Additional notes
      mcNotes: artistData.mc_notes || artistData.mcNotes || "",
      stageManagerNotes:
        artistData.stage_manager_notes || artistData.stageManagerNotes || "",
      showLink: artistData.show_link || artistData.showLink || "",
      notes: artistData.notes || "",
      // Music and media
      musicTracks: musicTracks || [],
      galleryFiles: galleryFiles || [],
      eventName: artistData.eventName || "",
    };

    // Save artist data to Google Cloud Storage
    await GCSService.saveArtistData(newArtist);

    // Add to event's artist index
    await upsertArrayFile(paths.artistsIndex(eventId), {
      id: newArtist.id,
      artistName: newArtist.artistName,
      eventId: eventId,
      status: newArtist.status,
      createdAt: newArtist.createdAt,
      performanceDate: null,
      assignDate: event?.createdAt || null,
    });

    // Broadcast update to WebSocket clients
    await broadcastEventsUpdate();

    console.log(
      `Artist data saved to Google Cloud Storage for artist: ${newArtist.id}`
    );

    return NextResponse.json(
      {
        message: "Artist registered successfully",
        artist: newArtist,
        storage: "Data saved to Google Cloud Storage",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating artist:", error);
    return NextResponse.json(
      { error: "Failed to register artist in Google Cloud Storage" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;
    const { artistId } = await request.json();

		// Get artist data from GCS to verify it exists
		const artistData = await GCSService.getArtistData(artistId);

		if (!artistData || artistData.eventId !== eventId) {
			return NextResponse.json(
				{ error: "Artist not found for this event" },
				{ status: 404 }
			);
		}

		// Delete artist files from GCS
		const filesToDelete = [
			`artists/${artistId}/profile.json`,
			`artists/${artistId}/technical.json`,
			`artists/${artistId}/social.json`,
			`artists/${artistId}/notes.json`,
			`artists/${artistId}/music.json`,
			`artists/${artistId}/gallery.json`,
			`events/${eventId}/artists/${artistId}.json`,
		];

		for (const file of filesToDelete) {
			try {
				await GCSService.deleteFile(file);
			} catch (error) {
				console.warn(`Failed to delete file ${file}:`, error);
			}
		}

		return NextResponse.json({
			message: "Artist removed successfully from Google Cloud Storage",
		});
	} catch (error) {
		console.error("Error deleting artist:", error);
		return NextResponse.json(
			{ error: "Failed to remove artist from Google Cloud Storage" },
			{ status: 500 }
		);
	}
}
