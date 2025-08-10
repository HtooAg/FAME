import { NextRequest, NextResponse } from "next/server"
import { paths, writeJsonFile, readJsonDirectory, readJsonFile } from "@/lib/gcs"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    const onlyActive = request.nextUrl.searchParams.get("active")
    if (onlyActive) {
      const active = await readJsonFile<any>(paths.emergencyActive(eventId), null)
      return NextResponse.json(active)
    }
    const log = await readJsonDirectory<any>(paths.emergencyLogDir(eventId))
    return NextResponse.json(log.sort((a,b)=> (a.timestamp||"").localeCompare(b.timestamp||"")))
  } catch (error) {
    console.error("Emergency GET error:", error)
    return NextResponse.json({ error: "Failed to fetch emergency codes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    const { code, message } = await request.json()
    const item = {
      id: uuidv4(),
      code,
      message,
      timestamp: new Date().toISOString(),
      active: true,
    }

    await writeJsonFile(paths.emergencyActive(eventId), item)
    await writeJsonFile(paths.emergencyLogFile(eventId, item.id), item)
    return NextResponse.json(item)
  } catch (error) {
    console.error("Emergency POST error:", error)
    return NextResponse.json({ error: "Failed to create emergency code" }, { status: 500 })
  }
}
