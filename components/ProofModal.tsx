"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { BingoCell } from "@/lib/bingo-cells";

interface Props {
  cell: BingoCell;
  existingProofUrl?: string;
  onClose: () => void;
  onComplete: (cellId: number, proofUrl: string) => void;
}

export default function ProofModal({ cell, existingProofUrl, onClose, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cellId", String(cell.id));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");
      onComplete(cell.id, data.proofUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-keyrus-red p-4">
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-0.5">
            Challenge #{cell.id}
          </p>
          <h2 className="text-white font-bold text-base leading-snug">{cell.text}</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing proof */}
          {existingProofUrl && !preview && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Your current proof
              </p>
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <Image
                  src={existingProofUrl}
                  alt="Current proof"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-keyrus-blue transition-colors"
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-cover"
              />
            ) : (
              <>
                <p className="text-4xl mb-2">📸</p>
                <p className="text-gray-500 text-sm font-medium">
                  {existingProofUrl ? "Upload a new proof photo" : "Upload your proof photo"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Click or drag & drop · JPG, PNG, GIF · max 10 MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="flex-1 py-3 bg-keyrus-red text-white rounded-xl font-bold disabled:opacity-40 hover:bg-red-800 transition-colors"
            >
              {uploading ? "Uploading…" : existingProofUrl ? "Update Proof" : "Mark Complete! 🎉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
