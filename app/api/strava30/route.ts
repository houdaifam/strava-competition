import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getStrava30Submissions, upsertStrava30 } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const submissions = await getStrava30Submissions();
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("[strava30] GET error:", err);
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const raw = formData.get("file");
  if (!(raw instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const file = raw;

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const safeName = session.user.email.replace(/[@.]/g, "_");
  const nameParts = file.name.split(".");
  const ext = nameParts.length > 1 ? nameParts.pop()! : "jpg";
  const path = `strava30/${safeName}-${Date.now()}.${ext}`;

  try {
    const blob = await put(path, file, { access: "public" });
    await upsertStrava30(
      session.user.email,
      session.user.name || session.user.email,
      blob.url
    );
    return NextResponse.json({ photoUrl: blob.url });
  } catch (err) {
    console.error("[strava30] POST error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
