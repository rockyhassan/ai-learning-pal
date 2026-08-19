import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Timer, Footprints, Star, Trophy, Coins } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { gameAudio } from "@/lib/game-audio";

type CardItem = {
  id: number;
  pairId: number;
  emoji: string;
  en: string;
  bn: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const PAIRS = [
  { pairId: 1, emoji: "🚀", en: "Rocket", bn: "রকেট" },
  { pairId: 2, emoji: "🌟", en: "Star", bn: "তারা" },
  { pairId: 3, emoji: "🍎", en: "Apple", bn: "আপেল" },
  { pairId: 4, emoji: "🐱", en: "Cat", bn: "বিড়াল" },
  { pairId: 5, emoji: "🧩", en: "Puzzle", bn: "ধাঁধা" },
  { pairId: 6, emoji: "📚", en: "Books", bn: "বই" },
];

function createShuffledDeck(): CardItem[] {
  const deck: CardItem[] = [];
  let idCounter = 1;

  PAIRS.forEach((pair) => {
    // Add 2 copies of each pair
    deck.push({
      id: idCounter++,
      pairId: pair.pairId,
      emoji: pair.emoji,
      en: pair.en,
      bn: pair.bn,
      isFlipped: false,
      isMatched: false,
    });
    deck.push({
      id: idCounter++,
      pairId: pair.pairId,
      emoji: pair.emoji,
      en: pair.en,
      bn: pair.bn,
      isFlipped: false,
      isMatched: false,
    });
  });

  return deck.sort(() => Math.random() - 0.5);
}

export function MemoryGame({
  onFinish,
  bestScore,
}: {
  onFinish: (score: number, coins: number) => void;
  bestScore: number;
}) {
  const { t } = useApp();
  const [cards, setCards] = useState<CardItem[]>(() => createShuffledDeck());
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Timer
  useEffect(() => {
    if (isGameOver) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver]);

  const handleCardClick = useCallback(
    (index: number) => {
      if (isChecking || isGameOver) return;
      const clickedCard = cards[index];
      if (clickedCard.isFlipped || clickedCard.isMatched) return;

      gameAudio.playTap();

      const newCards = [...cards];
      newCards[index].isFlipped = true;
      setCards(newCards);

      const newSelected = [...selectedCards, index];
      setSelectedCards(newSelected);

      if (newSelected.length === 2) {
        setIsChecking(true);
        setMoves((m) => m + 1);

        const [firstIdx, secondIdx] = newSelected;
        const firstCard = newCards[firstIdx];
        const secondCard = newCards[secondIdx];

        if (firstCard.pairId === secondCard.pairId) {
          // Match found!
          gameAudio.playCorrect();
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c,
              ),
            );
            setSelectedCards([]);
            setIsChecking(false);

            // Check if all matched
            const matchedCount = newCards.filter((c) => c.isMatched || c.id === firstCard.id || c.id === secondCard.id).length;
            if (matchedCount === cards.length) {
              gameAudio.playWin();
              setIsGameOver(true);
              const score = Math.max(100, 1000 - moves * 20 - seconds * 2);
              onFinish(score, 30);
            }
          }, 400);
        } else {
          // Not a match
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c,
              ),
            );
            setSelectedCards([]);
            setIsChecking(false);
          }, 800);
        }
      }
    },
    [cards, isChecking, isGameOver, moves, onFinish, seconds, selectedCards],
  );

  const restartGame = () => {
    setCards(createShuffledDeck());
    setSelectedCards([]);
    setMoves(0);
    setSeconds(0);
    setIsGameOver(false);
    setIsChecking(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const starCount = moves <= 10 ? 3 : moves <= 16 ? 2 : 1;
  const score = Math.max(200, 1000 - moves * 20 - seconds * 2);
  const isNewHighScore = isGameOver && score > bestScore;

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 grid place-items-center rounded-3xl bg-pink-100 dark:bg-pink-950/60 text-4xl shadow-soft">
          {isNewHighScore ? "🏆" : "🃏"}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {isNewHighScore ? t("New Best Record!", "নতুন সেরা রেকর্ড!") : t("Memory Match Champion!", "মেমোরি চ্যাম্পিয়ন!")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Sharp memory skills, Wafi!", "তোমার স্মৃতিশক্তি সত্যিই চমৎকার, ওয়াফি!")}
          </p>

          {/* Stars */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                className={`size-7 ${i < starCount ? "fill-amber-400 text-amber-400 animate-bounce" : "text-muted-foreground/30"
                  }`}
              />
            ))}
          </div>
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

        <button
          onClick={restartGame}
          className="tap w-full max-w-sm flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
        >
          <RotateCcw className="size-4" />
          {t("Play Again", "আবার খেলো")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 flex flex-col items-center">
      {/* Top HUD */}
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

        <div className="flex items-center gap-1">
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <span className="text-foreground">{cards.filter((c) => c.isMatched).length / 2}/6</span>
        </div>
      </div>

      {/* 4x3 Memory Grid */}
      <div className="grid grid-cols-4 gap-2.5 p-3 rounded-3xl bg-muted/70 border border-border/80 w-full max-w-sm">
        {cards.map((card, idx) => {
          const isFaceUp = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              disabled={isFaceUp || isChecking}
              onClick={() => handleCardClick(idx)}
              className={`tap aspect-square rounded-2xl border-2 font-black flex flex-col items-center justify-center transition-all duration-200 select-none ${card.isMatched
                  ? "bg-emerald-500/20 border-emerald-500 text-foreground scale-95 shadow-sm"
                  : isFaceUp
                    ? "bg-card border-primary text-foreground shadow-md rotate-y-180"
                    : "bg-gradient-to-br from-primary/80 to-primary border-primary text-primary-foreground shadow-soft hover:scale-105"
                }`}
            >
              {isFaceUp ? (
                <div className="flex flex-col items-center animate-in zoom-in-50 duration-150">
                  <span className="text-2xl sm:text-3xl">{card.emoji}</span>
                  <span className="text-[10px] font-bold mt-0.5 text-foreground/80 leading-tight">
                    {t(card.en, card.bn)}
                  </span>
                </div>
              ) : (
                <span className="text-lg opacity-80">❓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shuffle Button */}
      <button
        onClick={restartGame}
        className="tap w-full max-w-sm flex items-center justify-center gap-1.5 rounded-2xl bg-muted py-2.5 text-xs font-bold text-foreground border border-border hover:bg-muted/80"
      >
        <RotateCcw className="size-3.5" />
        {t("Reset Cards", "নতুন করে শুরু")}
      </button>
    </div>
  );
}
