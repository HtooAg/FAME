import { NextRequest, NextResponse } from "next/server"
import { paths, readJsonDirectory, writeJsonFile, readJsonFile } from "@/lib/gcs"
import { v4 as uuidv4 } from "uuid"

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    // Seed artists for event if empty
    const existing = await readJsonDirectory(paths.artistsDir(eventId))
    if (existing.length === 0) {
      const seed = [
        {
          id: "artist-1",
          name: "Isabella Rodriguez",
          stageName: "Bella Rose",
          email: "bella@fame.com",
          style: "Pop/R&B",
          music: ["Midnight Dreams", "City Lights", "Dancing Queen"],
          props: "LED backdrop, wireless mic, fog machine",
          notes: "Needs 2-minute setup for LED backdrop. Prefers stage left entrance.",
          biography: "Rising pop star with over 1M followers. Known for energetic performances and powerful vocals.",
          pictures: ["/placeholder.svg?height=200&width=200"],
          rehearsalDate: "2024-07-14",
          rehearsalTime: "10:00",
          qualityRating: 1,
          performanceOrder: 1,
          specialNotes: "Opening act - needs extra sound check",
        },
        {
          id: "artist-2",
          name: "Sarah Kim",
          stageName: "Neon Dreams",
          email: "neon@fame.com",
          style: "Electronic/Synthwave",
          music: ["Neon Nights", "Digital Love", "Cyber Dreams"],
          props: "DJ booth, laser lights, synthesizer setup",
          notes: "Complex electronic setup requires 30-minute sound check.",
          biography: "Electronic music producer and live performer. Creates immersive audiovisual experiences.",
          pictures: ["/placeholder.svg?height=200&width=200"],
          rehearsalDate: "2024-07-14",
          rehearsalTime: "14:00",
          qualityRating: 2,
          performanceOrder: 2,
          specialNotes: "Video projection needed during performance",
        },
        {
          id: "artist-3",
          name: "Marcus Thompson",
          stageName: "Thunder Storm",
          email: "thunder@fame.com",
          style: "Hip-Hop/Rap",
          music: ["Storm Warning", "Thunder Rolls", "Lightning Strike"],
          props: "Pyrotechnics, backup dancers (3), custom mic stand",
          notes: "Pyrotechnics require safety clearance. Backup dancers need changing area.",
          biography: "Underground hip-hop artist breaking into mainstream. Known for explosive live shows.",
          pictures: ["/placeholder.svg?height=200&width=200"],
          rehearsalDate: "2024-07-14",
          rehearsalTime: "11:30",
          qualityRating: 1,
          performanceOrder: 3,
          specialNotes: "Stage needs sweeping after pyrotechnics",
        },
      ]
      for (const a of seed) {
        await writeJsonFile(paths.artistFile(eventId, a.id), a)
      }
      await writeJsonFile(
        paths.performanceOrder(eventId),
        seed.sort((a,b) => (a.performanceOrder||0)-(b.performanceOrder||0)).map((a) => a.id)
      )
    }

    const artists = await readJsonDirectory(paths.artistsDir(eventId))
    return NextResponse.json(artists.sort((a: any,b: any)=> (a.performanceOrder||0)-(b.performanceOrder||0)))
  } catch (error) {
    console.error("Artists GET error:", error)
    return NextResponse.json({ error: "Failed to fetch artists" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params
    const body = await request.json()
    const id = body.id || uuidv4()
    const artist = { ...body, id }
    await writeJsonFile(paths.artistFile(eventId, id), artist)

    const order = await readJsonFile<string[]>(paths.performanceOrder(eventId), [])
    if (!order.includes(id)) {
      order.push(id)
      await writeJsonFile(paths.performanceOrder(eventId), order)
    }

    return NextResponse.json(artist)
  } catch (error) {
    console.error("Artist POST error:", error)
    return NextResponse.json({ error: "Failed to save artist" }, { status: 500 })
  }
}
