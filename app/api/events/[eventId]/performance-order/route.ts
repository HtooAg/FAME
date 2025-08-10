import { NextRequest, NextResponse } from "next/server"
import { paths, readJsonFile, writeJsonFile, readJsonDirectory } from "@/lib/gcs"

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const order = await readJsonFile<string[]>(paths.performanceOrder(params.eventId), [])
    return NextResponse.json(order)
  } catch (error) {
    console.error("Order GET error:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    const { order } = await request.json() as { order: string[] }
    if (!Array.isArray(order)) return NextResponse.json({ error: "Invalid order" }, { status: 400 })

    await writeJsonFile(paths.performanceOrder(eventId), order)

    const artists = await readJsonDirectory<any>(paths.artistsDir(eventId))
    const lookup = new Map(order.map((id, i) => [id, i + 1]))
    for (const a of artists) {
      const po = lookup.get(a.id) || a.performanceOrder || 0
      await writeJsonFile(paths.artistFile(eventId, a.id), { ...a, performanceOrder: po })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Order POST error:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
