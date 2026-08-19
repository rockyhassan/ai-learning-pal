import { useState, useCallback } from "react";
import { Volume2, RotateCcw, Sparkles, Delete, CheckCircle2, Coins } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { gameAudio } from "@/lib/game-audio";

type SpellingWord = {
  word: string; // UPPERCASE
  bn: string;
  hint: string;
};

const SPELLING_WORDS: SpellingWord[] = [
  { word: "BRAVE", bn: "সাহসী", hint: "Fearless & heroic" },
  { word: "PLANET", bn: "গ্রহ", hint: "Orbits around a star" },
  { word: "SCHOOL", bn: "বিদ্যালয়", hint: "Place of learning" },
  { word: "FRIEND", bn: "বন্ধু", hint: "Someone you like and trust" },
  { word: "GENTLE", bn: "কোমল / শান্ত", hint: "Mild and kind" },
  { word: "HARVEST", bn: "ফসল কাটা", hint: "Gathering crops in winter" },
  { word: "CURIOUS", bn: "কৌতূহলী", hint: "Eager to learn and know" },
  { word: "SCIENCE", bn: "বিজ্ঞান", hint: "Study of nature and facts" },
  { word: "WEATHER", bn: "আবহাওয়া", hint: "Sunny, rainy or windy" },
  { word: "GARDEN", bn: "বাগান", hint: "Place with plants & flowers" },
  { word: "ANIMAL", bn: "প্রাণী", hint: "Living creature" },
  { word: "SUMMER", bn: "গ্রীষ্মকাল", hint: "Warmest season" },
];

function prepareSpellingRounds(count = 6) {
  const chosen = [...SPELLING_WORDS].sort(() => Math.random() - 0.5).slice(0, count);
  return chosen.map((item) => {
    const letters = item.word.split("");
    // Create pool with extra distractor letters
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const distractors = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]);
    const tilePool = [...letters, ...distractors].sort(() => Math.random() - 0.5);

    return {
      item,
      target: item.word,
      tilePool: tilePool.map((letter, idx) => ({ id: `${letter}-${idx}`, letter, used: false })),
    };
  });
}

export function SpellingGame({
  onFinish,
  bestScore,
}: {
  onFinish: (score: number, coins: number) => void;
  bestScore: number;
}) {
  const { t } = useApp();
  const [rounds, setRounds] = useState(() => prepareSpellingRounds(6));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userLetters, setUserLetters] = useState<{ id: string; letter: string }[]>([]);
  const [status, setStatus] = useState<"typing" | "correct" | "wrong">("typing");
  const [score, setScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const currentRound = rounds[currentIndex];
  const targetWord = currentRound.target;

  const playWord = () => {
    gameAudio.speak(currentRound.item.word.toLowerCase());
  };

  const handleTapTile = (tile: { id: string; letter: string; used: boolean }) => {
    if (tile.used || status !== "typing" || userLetters.length >= targetWord.length) return;

    gameAudio.playTap();
    const nextLetters = [...userLetters, { id: tile.id, letter: tile.letter }];
    setUserLetters(nextLetters);

    // Update used flag in tile pool
    currentRound.tilePool = currentRound.tilePool.map((t) => (t.id === tile.id ? { ...t, used: true } : t));

    // If word is now filled
    if (nextLetters.length === targetWord.length) {
      const spelled = nextLetters.map((l) => l.letter).join("");
      if (spelled === targetWord) {
        setStatus("correct");
        gameAudio.playCorrect();
        setScore((s) => s + 150);
        setCoinsEarned((c) => c + 5);
        setCorrectCount((cc) => cc + 1);

        setTimeout(() => {
          if (currentIndex + 1 >= rounds.length) {
            gameAudio.playWin();
            setGameOver(true);
            onFinish(score + 150, coinsEarned + 5);
          } else {
            setCurrentIndex((idx) => idx + 1);
            setUserLetters([]);
            setStatus("typing");
          }
        }, 1200);
      } else {
        setStatus("wrong");
        gameAudio.playWrong();
        setTimeout(() => {
          // Reset typed letters for this round
          setUserLetters([]);
          currentRound.tilePool = currentRound.tilePool.map((t) => ({ ...t, used: false }));
          setStatus("typing");
        }, 900);
      }
    }
  };

  const handleBackspace = () => {
    if (userLetters.length === 0 || status !== "typing") return;
    gameAudio.playTap();
    const last = userLetters[userLetters.length - 1];
    setUserLetters((prev) => prev.slice(0, -1));
    currentRound.tilePool = currentRound.tilePool.map((t) => (t.id === last.id ? { ...t, used: false } : t));
  };

  const restartGame = () => {
    setRounds(prepareSpellingRounds(6));
    setCurrentIndex(0);
    setUserLetters([]);
    setStatus("typing");
    setScore(0);
    setCoinsEarned(0);
    setCorrectCount(0);
    setGameOver(false);
  };

  const isNewHighScore = gameOver && score > bestScore;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 grid place-items-center rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-4xl shadow-soft">
          {isNewHighScore ? "🏆" : "🐝"}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {isNewHighScore ? t("New Best Score!", "নতুন সেরা রেকর্ড!") : t("Spelling Bee Champ!", "বানান চ্যাম্পিয়ন!")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("You spelled all the words like a pro, Wafi!", "সব বানান দারুণভাবে শেষ করেছ, ওয়াফি!")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Score", "স্কোর")}</p>
            <p className="text-xl font-black text-primary mt-1">{score}</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Correct", "সঠিক")}</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {correctCount}/{rounds.length}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Coins", "কয়েন")}</p>
            <p className="text-xl font-black text-amber-500 mt-1">+{coinsEarned} 🪙</p>
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
    <div className="space-y-4 py-2">
      {/* Top HUD */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/60 px-3.5 py-2.5 rounded-2xl">
        <span className="text-foreground">
          {t("Round", "রাউন্ড")} {currentIndex + 1}/{rounds.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-primary font-black text-sm">{score} pts</span>
          <span className="text-amber-500 font-bold flex items-center gap-0.5">
            <Coins className="size-3.5" />+{coinsEarned}
          </span>
        </div>
      </div>

      {/* Word Hint & Audio Prompt Card */}
      <div className="py-5 px-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 text-center flex flex-col items-center justify-center relative">
        <button
          type="button"
          onClick={playWord}
          className="tap inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-amber-950 font-bold text-xs shadow-soft hover:scale-105 active:scale-95 transition-all"
        >
          <Volume2 className="size-4" />
          <span>{t("Listen to Word", "শব্দটি শোনো")}</span>
        </button>

        <p className="text-sm font-bold text-foreground mt-3">
          {t("Meaning", "অর্থ")}: <span className="text-primary">{currentRound.item.bn}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">({currentRound.item.hint})</p>

        {/* Letter Slots */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {Array.from({ length: targetWord.length }).map((_, i) => {
            const letterObj = userLetters[i];
            const hasLetter = !!letterObj;
            let slotStyle = "bg-card border-border text-foreground";

            if (status === "correct") {
              slotStyle = "bg-emerald-500 border-emerald-600 text-white font-black scale-105";
            } else if (status === "wrong") {
              slotStyle = "bg-rose-500 border-rose-600 text-white font-black animate-shake";
            }

            return (
              <div
                key={i}
                className={`size-11 sm:size-12 rounded-2xl border-2 font-black text-xl sm:text-2xl flex items-center justify-center shadow-sm transition-all duration-150 select-none ${hasLetter ? slotStyle : "border-dashed border-border/80 bg-muted/30"
                  }`}
              >
                {letterObj?.letter || ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Letter Keyboard Bank */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-center text-muted-foreground uppercase tracking-wider">
          {t("Tap letters to spell", "অক্ষরে ট্যাপ করে বানান তৈরি করো")}
        </p>

        <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
          {currentRound.tilePool.map((tile) => (
            <button
              key={tile.id}
              disabled={tile.used || status !== "typing"}
              onClick={() => handleTapTile(tile)}
              className={`tap size-10 sm:size-11 rounded-2xl border-2 font-extrabold text-lg flex items-center justify-center transition-all duration-100 ${tile.used
                  ? "bg-muted/30 border-transparent opacity-20 text-muted-foreground scale-95"
                  : "bg-card border-border hover:border-amber-500 text-foreground shadow-sm hover:shadow"
                }`}
            >
              {tile.letter}
            </button>
          ))}

          {/* Backspace Button */}
          <button
            type="button"
            disabled={userLetters.length === 0 || status !== "typing"}
            onClick={handleBackspace}
            className="tap px-3 rounded-2xl border-2 border-border bg-muted/80 text-foreground font-bold flex items-center justify-center gap-1 hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
            title="Delete last letter"
          >
            <Delete className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
