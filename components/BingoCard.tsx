"use client";
import { useState } from "react";
import { BINGO_CELLS } from "@/lib/bingo-cells";
import BingoCell from "./BingoCell";
import ProofModal from "./ProofModal";

interface Props {
  initialCompletionMap: Record<number, string>;
  userEmail: string;
}

const COLUMNS = ["B", "I", "N", "G", "O"];

export default function BingoCard({ initialCompletionMap }: Props) {
  const [completionMap, setCompletionMap] = useState<Record<number, string>>(initialCompletionMap);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);

  const selectedCell = BINGO_CELLS.find((c) => c.id === selectedCellId) ?? null;

  const handleComplete = (cellId: number, proofUrl: string) => {
    setCompletionMap((prev) => ({ ...prev, [cellId]: proofUrl }));
    setSelectedCellId(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* Red header */}
        <div className="bg-keyrus-red px-6 py-5 text-center">
          <p className="text-white/70 text-xs font-bold tracking-[0.3em] uppercase mb-1">
            Keyrus
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-wide leading-none">
            SPORTS BINGO
          </h1>
        </div>

        {/* Column headers */}
        <div className="bg-keyrus-blue flex justify-between px-4 pt-4 pb-2">
          {COLUMNS.map((letter) => (
            <div key={letter} className="flex justify-center">
              <span className="bg-keyrus-yellow text-black font-black text-2xl md:text-3xl italic w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-md">
                {letter}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="bg-keyrus-blue p-4 grid grid-cols-4 gap-3">
          {BINGO_CELLS.map((cell) => (
            <BingoCell
              key={cell.id}
              cell={cell}
              isCompleted={!!completionMap[cell.id]}
              onClick={() => setSelectedCellId(cell.id)}
            />
          ))}
        </div>
      </div>

      {selectedCell && (
        <ProofModal
          cell={selectedCell}
          existingProofUrl={completionMap[selectedCell.id]}
          onClose={() => setSelectedCellId(null)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
