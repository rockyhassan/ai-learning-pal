import { useState, useEffect, useCallback, useTransition } from "react";
import { RotateCcw, Sparkles, Trophy, Timer, Footprints, Coins, HelpCircle } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { gameAudio } from "@/lib/game-audio";

type Tile = number | null; // 1-8 or null for empty

const SOLVED_STATE: Tile[] = [1, 2, 3, 4, 5, 6, 7, 8, null];

// Make random valid slides from solved state to guarantee solvability
function createShuffledBoard(steps = 25): Tile[] {
  const board = [...SOLVED_STATE];
  let emptyIdx = 8;

  for (let i = 0; i < steps; i++) {
    const validMoves: number[] = [];
    const row = Math.floor(emptyIdx / 3);
    const col = emptyIdx % 3;

    if (row > 0) validMoves.push(emptyIdx - 3); // top
    if (row < 2) validMoves.push(emptyIdx + 3); // bottom
    if (col > 0) validMoves.push(emptyIdx - 1); // left
    if (col < 2) validMoves.push(emptyIdx + 1); // right

    const chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
    board[emptyIdx] = board[chosen];
    board[chosen] = null;
    emptyIdx = chosen;
  }

  // Ensure it's not already solved
  if (isBoardSolved(board)) {
    return createShuffledBoard(steps + 5);
  }

  return board;
}

function isBoardSolved(board: Tile[]): boolean {
  for (let i = 0; i < 8; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[8] === null;
}

export function PuzzleGame({
  onFinish,
  bestScore,
}: {
  onFinish: (score: number, coins: number) => void;
  bestScore: number;
}) {
  const { t } = useApp();
  const [board, setBoard] = useState<Tile[]>(() => createShuffledBoard(20));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Timer
  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  const handleTileClick = useCallback(
    (index: number) => {
      if (isWon) return;
      const tile = board[index];
      if (tile === null) return;

      const emptyIdx = board.indexOf(null);
      const row = Math.floor(index / 3);
      const col = index % 3;
      const emptyRow = Math.floor(emptyIdx / 3);
      const emptyCol = emptyIdx % 3;

      // Check if adjacent (same row & diff col 1, OR same col & diff row 1)
      const isAdjacent =
        (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
        (col === emptyCol && Math.abs(row - emptyRow) === 1);

      if (!isAdjacent) return;

      gameAudio.playTap();

      const newBoard = [...board];
      newBoard[emptyIdx] = tile;
      newBoard[index] = null;
      setBoard(newBoard);
      setMoves((m) => m + 1);

      if (isBoardSolved(newBoard)) {
        setIsWon(true);
        gameAudio.playWin();
        // Calculate score based on speed and moves
        const timeBonus = Math.max(0, 500 - seconds * 3);
        const moveBonus = Math.max(0, 500 - moves * 10);
        const totalScore = 1000 + timeBonus + moveBonus;
        onFinish(totalScore, 30);
      }
    },
    [board, isWon, moves, onFinish, seconds],
  );

  const restartPuzzle = (easy = false) => {
    setBoard(createShuffledBoard(easy ? 10 : 25));
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
    setShowHint(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const calculatedScore = Math.max(200, 1000 + Math.max(0, 500 - seconds * 3) + Math.max(0, 500 - moves * 10));
  const isNewHighScore = isWon && calculatedScore > bestScore;

  if (isWon) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 grid place-items-center rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-4xl shadow-soft">
          {isNewHighScore ? "🏆" : "🧩"}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {isNewHighScore ? t("New Best Score!", "নতুন সেরা স্কোর!") : t("Puzzle Solved!", "ধাঁধা সমাধান সম্পন্ন!")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Awesome logical thinking, Wafi!", "দারুণ বুদ্ধিমত্তা দেখিয়েছ, ওয়াফি!")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Moves", "চাল")}</p>
            <p className="text-xl font-black text-primary mt-1">{moves}</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Time", "সময়")}</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatTime(seconds)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Coins", "কয়েন")}</p>
            <p className="text-xl font-black text-amber-500 mt-1">+30 🪙</p>
          </div>
        </div>

        <div className="flex gap-2 w-full max-w-sm">
          <button
            onClick={() => restartPuzzle(false)}
            className="tap flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
          >
            <RotateCcw className="size-4" />
            {t("Play Again", "আবার খেলো")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 flex flex-col items-center">
      {/* Top HUD: Moves, Timer, Hint toggle */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/60 px-4 py-2.5 rounded-2xl w-full max-w-sm">
        <div className="flex items-center gap-1.5">
          <Footprints className="size-4 text-primary" />
          <span className="text-foreground">
            {t("Moves", "চাল")}: {moves}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Timer className="size-4 text-amber-500" />
          <span className="font-mono text-foreground">{formatTime(seconds)}</span>
        </div>

        <button
          onClick={() => setShowHint(!showHint)}
          className="tap inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-card border border-border text-foreground hover:bg-muted"
          title="Toggle Target Preview"
        >
          <HelpCircle className="size-3.5 text-indigo-500" />
          <span>{showHint ? t("Hide", "লুকান") : t("Goal", "লক্ষ্য")}</span>
        </button>
      </div>

      {/* Target Goal Preview Banner (if toggled) */}
      {showHint && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs text-center text-indigo-700 dark:text-indigo-300 w-full max-w-sm animate-in fade-in">
          {t("Slide tiles to arrange numbers 1 to 8 in order.", "টাইলগুলো স্লাইড করে ১ থেকে ৮ ক্রমানুসারে সাজাও।")}
        </div>
      )}

      {/* 3x3 Puzzle Board */}
      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-3xl bg-muted/80 border-2 border-border/80 shadow-inner w-full max-w-[280px] sm:max-w-[320px] aspect-square">
        {board.map((tile, idx) => {
          const isEmpty = tile === null;
          const isCorrectPos = tile === idx + 1;

          if (isEmpty) {
            return (
              <div
                key={`empty-${idx}`}
                className="rounded-2xl border-2 border-dashed border-border/40 bg-background/30 flex items-center justify-center"
              />
            );
          }

          return (
            <button
              key={`tile-${tile}`}
              onClick={() => handleTileClick(idx)}
              className={`tap rounded-2xl border flex flex-col items-center justify-center font-black text-2xl sm:text-3xl shadow-sm transition-all duration-100 select-none ${isCorrectPos
                  ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-card border-border hover:border-primary/50 text-foreground hover:shadow"
                }`}
            >
              <span>{tile}</span>
              {isCorrectPos && <span className="text-[9px] font-bold opacity-60">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 w-full max-w-sm pt-2">
        <button
          onClick={() => restartPuzzle(false)}
          className="tap flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-muted py-2.5 text-xs font-bold text-foreground border border-border hover:bg-muted/80"
        >
          <RotateCcw className="size-3.5" />
          {t("Shuffle", "নতুন করে সাজাও")}
        </button>
        <button
          onClick={() => restartPuzzle(true)}
          className="tap flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-2.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/20"
        >
          <Sparkles className="size-3.5" />
          {t("Easy Mode", "সহজ ধাঁধা")}
        </button>
      </div>
    </div>
  );
}
