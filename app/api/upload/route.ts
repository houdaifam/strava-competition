import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { upsertCompletion } from "@/lib/db";
import { BINGO_CELLS } from "@/lib/bingo-cells";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("file") as File[];
  const cellId = parseInt(formData.get("cellId") as string, 10);

  if (files.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!BINGO_CELLS.find((c) => c.id === cellId)) {
    return NextResponse.json({ error: "Invalid cell" }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }
  }

  const safeName = session.user.email.replace(/[@.]/g, "_");
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `proofs/${safeName}/${cellId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const blob = await put(path, file, { access: "public" });
    urls.push(blob.url);
  }

  const proofUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls);

  await upsertCompletion(
    session.user.email,
    session.user.name || session.user.email,
    cellId,
    proofUrl
  );

  return NextResponse.json({ proofUrl });
}
