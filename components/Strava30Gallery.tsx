"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { Strava30Submission } from "@/lib/db";

interface Props {
  initialSubmissions: Strava30Submission[];
  currentUserEmail: string;
  currentUserName: string;
}

export default function Strava30Gallery({
  initialSubmissions,
  currentUserEmail,
  currentUserName,
}: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mySubmission = submissions.find((s) => s.user_email === currentUserEmail);
  const others = submissions.filter((s) => s.user_email !== currentUserEmail);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large — max 10 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/strava30", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Upload failed");
      }
      const data = await res.json();

      const updated: Strava30Submission = {
        user_email: currentUserEmail,
        user_name: currentUserName || null,
        photo_url: data.photoUrl,
        submitted_at: mySubmission?.submitted_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSubmissions((prev) => [
        updated,
        ...prev.filter((s) => s.user_email !== currentUserEmail),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError("Only image files are allowed.");
      return;
    }
    handleFile(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Your 30 */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-keyrus-red p-4">
          <h2 className="text-white font-black text-xl italic tracking-wide">YOUR 30</h2>
        </div>
        <div className="p-5">
          {mySubmission ? (
            <div className="relative">
              <div className="relative w-full h-72 rounded-xl overflow-hidden">
                <Image
                  src={mySubmission.photo_url}
                  alt="Your Strava 30"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute top-3 right-3 bg-black/60 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors disabled:opacity-40"
              >
                {uploading ? "Uploading…" : "Edit"}
              </button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-keyrus-blue transition-colors"
            >
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-gray-500 font-medium">
                {uploading ? "Uploading…" : "Upload your Strava 30 screenshot"}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Click or drag & drop · JPG, PNG · max 10 MB
              </p>
            </div>
          )}
          {error && (
            <p className="mt-3 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-keyrus-red p-4">
          <h2 className="text-white font-black text-xl italic tracking-wide">
            THE WALL OF 30s
          </h2>
        </div>
        <div className="p-5">
          {others.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No submissions yet — be the first! 🏃
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {others.map((s) => (
                <div key={s.user_email} className="space-y-1">
                  <div className="relative w-full h-40 rounded-xl overflow-hidden">
                    <Image
                      src={s.photo_url}
                      alt={`${s.user_name ?? "Anonymous"}'s 30`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs font-semibold text-gray-600 truncate px-1">
                    {s.user_name ?? s.user_email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
