import { auth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const carpeta = (formData.get("carpeta") as string) ?? "misc"

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera los 5 MB" }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG o WebP" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const fileName = `${carpeta}/${session.user.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
