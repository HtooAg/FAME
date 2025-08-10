import { NextRequest, NextResponse } from "next/server"
import { paths, readJsonFile, writeJsonFile } from "@/lib/gcs"

export async function PATCH(request: NextRequest, { params }: { params: { eventId: string, artistId: string }}) {
  try {
    const { eventId, artistId } = params
    const updates = await request.json()
    const filePath = paths.artistFile(eventId, artistId)
    const existing = await readJsonFile<any>(filePath, null)
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    const merged = { ...existing, ...updates }
    await writeJsonFile(filePath, merged)
    return NextResponse.json(merged)
  } catch (error) {
    console.error("Artist PATCH error:", error)
    return NextResponse.json({ error: "Failed to update artist" }, { status: 500 })
  }
}
