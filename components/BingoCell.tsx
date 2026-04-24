import { BingoCell as BingoCellType } from "@/lib/bingo-cells";

interface Props {
  cell: BingoCellType;
  isCompleted: boolean;
  onClick: () => void;
}

export default function BingoCell({ cell, isCompleted, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded-xl text-center text-xs font-medium leading-snug
        min-h-[90px] md:min-h-[110px] w-full transition-all duration-200
        border-2 cursor-pointer select-none
        ${
          isCompleted
            ? "bg-green-50 border-green-400 text-green-700 shadow-inner"
            : "bg-keyrus-cream border-keyrus-cream hover:border-keyrus-yellow hover:shadow-lg active:scale-95"
        }
      `}
    >
      {isCompleted && (
        <div className="absolute inset-0 flex items-start justify-end p-1.5">
          <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            ✓
          </span>
        </div>
      )}
      <span className={isCompleted ? "opacity-60" : ""}>{cell.text}</span>
    </button>
  );
}
