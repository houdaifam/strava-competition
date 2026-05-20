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

function parseProofUrls(proofUrl?: string): string[] {
  if (!proofUrl) return [];
  try { return JSON.parse(proofUrl) as string[]; }
  catch { return [proofUrl]; }
}

function compressImage(file: File, maxPx = 1920, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function ProofModal({ cell, existingProofUrl, onClose, onComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingUrls = parseProofUrls(existingProofUrl);

  const addFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imageFiles]);
    setPreviews((prev) => [...prev, ...imageFiles.map((f) => URL.createObjectURL(f))]);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) addFiles(selected);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));

      const formData = new FormData();
      compressed.forEach((f) => formData.append("file", f));
      formData.append("cellId", String(cell.id));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        let message = "Upload failed";
        try { const data = await res.json(); message = data.error || message; } catch { /* non-JSON response */ }
        throw new Error(message);
      }
      const data = await res.json();
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
          {existingUrls.length > 0 && previews.length === 0 && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Your current proof
              </p>
              <div className={`grid gap-2 ${existingUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {existingUrls.map((url, i) => (
                  <div key={i} className="relative w-full h-40 rounded-xl overflow-hidden">
                    <Image src={url} alt={`Proof ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => previews.length === 0 && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-5 transition-colors ${
              previews.length === 0
                ? "text-center cursor-pointer hover:border-keyrus-blue border-gray-300"
                : "border-gray-200"
            }`}
          >
            {previews.length > 0 ? (
              <div className={`grid gap-2 ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-32 rounded-lg object-cover"
                    />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-keyrus-blue hover:text-keyrus-blue transition-colors"
                >
                  + Add more
                </button>
              </div>
            ) : (
              <>
                <p className="text-4xl mb-2">📸</p>
                <p className="text-gray-500 text-sm font-medium">
                  {existingProofUrl ? "Upload new proof photos" : "Upload your proof photos"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Click or drag & drop · multiple files · JPG, PNG
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
              disabled={files.length === 0 || uploading}
              className="flex-1 py-3 bg-keyrus-red text-white rounded-xl font-bold disabled:opacity-40 hover:bg-red-800 transition-colors"
            >
              {uploading
                ? "Compressing & uploading…"
                : existingProofUrl
                ? "Update Proof"
                : "Mark Complete! 🎉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
