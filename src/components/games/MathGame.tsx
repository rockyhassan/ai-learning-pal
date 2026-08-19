import { useState, useEffect, useCallback, useMemo } from "react";
import { Zap, Trophy, Coins, RotateCcw, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { gameAudio } from "@/lib/game-audio";

type Question = {
  equation: string;
  answer: number;
  options: number[];
  opSymbol: string;
};

function generateQuestion(): Question {
  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0;
  let b = 0;
  let answer = 0;

  if (op === "+") {
    a = Math.floor(Math.random() * 45) + 5;
    b = Math.floor(Math.random() * 45) + 5;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 50) + 20;
    b = Math.floor(Math.random() * (a - 5)) + 3;
    answer = a - b;
  } else if (op === "×") {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  } else {
    b = Math.floor(Math.random() * 8) + 2;
    answer = Math.floor(Math.random() * 9) + 2;
    a = b * answer;
  }

  // Generate 3 unique wrong options close to answer
  const distractors = new Set<number>();
  distractors.add(answer);

  const offsets = [-10, 10, -2, 2, -1, 1, -5, 5, -3, 3];
  offsets.sort(() => Math.random() - 0.5);

  for (const off of offsets) {
    const val = answer + off;
    if (val > 0 && !distractors.has(val)) {
      distractors.add(val);
      if (distractors.size === 4) break;
    }
  }

  while (distractors.size < 4) {
    const r = Math.max(1, answer + Math.floor(Math.random() * 15) - 7);
    distractors.add(r);
  }

  const options = Array.from(distractors).sort(() => Math.random() - 0.5);

  return {
    equation: `${a} ${op} ${b}`,
    answer,
    options,
    opSymbol: op,
  };
}

const TOTAL_ROUNDS = 10;
const TIME_PER_QUESTION = 15;

export function MathGame({
  onFinish,
  bestScore,
}: {
  onFinish: (score: number, coins: number) => void;
  bestScore: number;
}) {
  const { t } = useApp();
  const [currentRound, setCurrentRound] = useState(1);
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [gameOver, setGameOver] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (gameOver || selectedOption !== null) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, gameOver, selectedOption]);

  const handleAnswer = useCallback(
    (chosen: number | null) => {
      if (selectedOption !== null || gameOver) return;
      setSelectedOption(chosen ?? -9999);

      const isCorrect = chosen === question.answer;

      if (isCorrect) {
        gameAudio.playCorrect();
        const streakBonus = streak * 15;
        const speedBonus = Math.floor(timeLeft * 3);
        const roundScore = 100 + streakBonus + speedBonus;
        setScore((s) => s + roundScore);
        setStreak((str) => str + 1);
        setCoinsEarned((c) => c + 5);
        setCorrectCount((cc) => cc + 1);
      } else {
        gameAudio.playWrong();
        setStreak(0);
      }

      setTimeout(() => {
        if (currentRound >= TOTAL_ROUNDS) {
          gameAudio.playWin();
          setGameOver(true);
          onFinish(
            score + (isCorrect ? 100 + streak * 15 + Math.floor(timeLeft * 3) : 0),
            coinsEarned + (isCorrect ? 5 : 0),
          );
        } else {
          setCurrentRound((r) => r + 1);
          setQuestion(generateQuestion());
          setSelectedOption(null);
          setTimeLeft(TIME_PER_QUESTION);
        }
      }, 1100);
    },
    [selectedOption, gameOver, question.answer, streak, timeLeft, score, coinsEarned, currentRound, onFinish],
  );

  const restartGame = () => {
    setCurrentRound(1);
    setQuestion(generateQuestion());
    setSelectedOption(null);
    setScore(0);
    setStreak(0);
    setCoinsEarned(0);
    setCorrectCount(0);
    setTimeLeft(TIME_PER_QUESTION);
    setGameOver(false);
  };

  const isNewHighScore = gameOver && score > bestScore;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 grid place-items-center rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-4xl shadow-soft">
          {isNewHighScore ? "🏆" : "🎉"}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {isNewHighScore ? t("New Best Score!", "নতুন রেকর্ড!") : t("Sprint Completed!", "গণিত দৌড় সম্পন্ন!")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Great mental math workout, Wafi!", "অসাধারণ গণিত অনুশীলন করেছ, ওয়াফি!")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Score", "স্কোর")}</p>
            <p className="text-xl font-black text-primary mt-1">{score}</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Accuracy", "সঠিক")}</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {correctCount}/{TOTAL_ROUNDS}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/70 text-center">
            <p className="text-xs font-semibold text-muted-foreground">{t("Earned", "কয়েন")}</p>
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
      {/* Top HUD: Round, Streak, Score */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/60 px-3.5 py-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground">
            {t("Question", "প্রশ্ন")} {currentRound}/{TOTAL_ROUNDS}
          </span>
        </div>

        {streak > 1 && (
          <div className="flex items-center gap-1 text-amber-500 font-extrabold animate-bounce">
            <Zap className="size-3.5 fill-amber-500" />
            <span>
              {streak}x {t("Streak!", "স্ট্রিক!")}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-primary font-black text-sm">{score} pts</span>
          <span className="text-amber-500 font-bold flex items-center gap-0.5">
            <Coins className="size-3.5" />+{coinsEarned}
          </span>
        </div>
      </div>

      {/* Progress & Time bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${timeLeft <= 4 ? "bg-red-500" : timeLeft <= 8 ? "bg-amber-500" : "bg-primary"
            }`}
          style={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
        />
      </div>

      {/* Main Equation Display */}
      <div className="py-8 px-4 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 text-center flex flex-col items-center justify-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary/80 mb-2">
          {t("Calculate Speed Challenge", "দ্রুত উত্তর দাও")}
        </p>
        <div className="text-4xl sm:text-5xl font-black tracking-tight text-foreground select-none">
          {question.equation} = <span className="text-primary">?</span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          ⏱️ {timeLeft}s {t("remaining", "বাকি")}
        </p>
      </div>

      {/* 4 Choices Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {question.options.map((opt) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === question.answer;
          let btnStyle = "bg-card border-border hover:border-primary/50 text-foreground";

          if (selectedOption !== null) {
            if (isCorrect) {
              btnStyle = "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20";
            } else if (isSelected) {
              btnStyle = "bg-rose-500 border-rose-600 text-white shadow-md shadow-rose-500/20";
            } else {
              btnStyle = "bg-muted/40 border-transparent opacity-40 text-muted-foreground";
            }
          }

          return (
            <button
              key={opt}
              disabled={selectedOption !== null}
              onClick={() => handleAnswer(opt)}
              className={`tap min-h-[64px] rounded-2xl border-2 text-xl sm:text-2xl font-black flex items-center justify-center transition-all duration-150 ${btnStyle}`}
            >
              <span>{opt}</span>
              {selectedOption !== null && isCorrect && <CheckCircle2 className="size-5 ml-2 text-white" />}
              {selectedOption !== null && isSelected && !isCorrect && <XCircle className="size-5 ml-2 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
