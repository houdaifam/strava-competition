import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { initDB, upsertCompletion } from "@/lib/db";
import { BINGO_CELLS } from "@/lib/bingo-cells";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const cellId = parseInt(formData.get("cellId") as string, 10);

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!BINGO_CELLS.find((c) => c.id === cellId)) {
    return NextResponse.json({ error: "Invalid cell" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const safeName = session.user.email.replace(/[@.]/g, "_");
  const path = `proofs/${safeName}/${cellId}-${Date.now()}.${ext}`;

  const blob = await put(path, file, { access: "public" });

  await initDB();
  await upsertCompletion(
    session.user.email,
    session.user.name || session.user.email,
    cellId,
    blob.url
  );

  return NextResponse.json({ proofUrl: blob.url });
}
