import { useState, useCallback } from "react";
import { Volume2, RotateCcw, CheckCircle2, XCircle, Sparkles, Coins } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { gameAudio } from "@/lib/game-audio";

type WordItem = {
  word: string;
  bn: string;
  ipa: string;
  example: string;
  synonym?: string;
};

const VOCAB_BANK: WordItem[] = [
  { word: "Curious", bn: "কৌতূহলী", ipa: "/ˈkjʊəriəs/", example: "Wafi is curious about space and stars." },
  { word: "Brave", bn: "সাহসী", ipa: "/breɪv/", example: "The brave kid helped his friend." },
  { word: "Harvest", bn: "ফসল কাটা", ipa: "/ˈhɑːvɪst/", example: "Farmers harvest golden rice in winter." },
  { word: "Journey", bn: "যাত্রা / ভ্রমণ", ipa: "/ˈdʒɜːni/", example: "Our journey across the river was thrilling." },
  { word: "Gentle", bn: "কোমল / শান্ত", ipa: "/ˈdʒentl/", example: "She spoke with a gentle, smiling voice." },
  { word: "Discover", bn: "আবিষ্কার করা", ipa: "/dɪˈskʌvər/", example: "Scientists discover new secrets of nature." },
  { word: "Honest", bn: "সৎ", ipa: "/ˈɒnɪst/", example: "An honest boy is loved by everyone." },
  { word: "Enormous", bn: "বিশাল / প্রকাণ্ড", ipa: "/ɪˈnɔːməs/", example: "An enormous elephant walked through the jungle." },
  { word: "Delightful", bn: "আনন্দদায়ক", ipa: "/dɪˈlaɪtfʊl/", example: "We had a delightful picnic by the lake." },
  { word: "Protect", bn: "রক্ষা করা", ipa: "/prəˈtekt/", example: "Trees protect the soil and environment." },
  { word: "Brilliant", bn: "মেধাবী / উজ্জ্বল", ipa: "/ˈbrɪliənt/", example: "Wafi gave a brilliant answer in class." },
  { word: "Patient", bn: "ধৈর্যশীল", ipa: "/ˈpeɪʃnt/", example: "Be patient while learning something new." },
];

function prepareQuestions(count = 8) {
  const shuffled = [...VOCAB_BANK].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((item) => {
    // Pick 3 random wrong Bengali meanings
    const wrongOptions = VOCAB_BANK.filter((w) => w.word !== item.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.bn);

    const options = [item.bn, ...wrongOptions].sort(() => Math.random() - 0.5);

    return {
      item,
      options,
      correct: item.bn,
    };
  });
}

export function VocabularyGame({
  onFinish,
  bestScore,
}: {
  onFinish: (score: number, coins: number) => void;
  bestScore: number;
}) {
  const { t } = useApp();
  const [questions, setQuestions] = useState(() => prepareQuestions(8));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = useCallback(
    (option: string) => {
      if (selectedOption !== null || gameOver) return;
      setSelectedOption(option);

      const isCorrect = option === currentQ.correct;

      if (isCorrect) {
        gameAudio.playCorrect();
        setScore((s) => s + 100);
        setCoinsEarned((c) => c + 5);
        setCorrectCount((cc) => cc + 1);
      } else {
        gameAudio.playWrong();
      }

      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          gameAudio.playWin();
          setGameOver(true);
          onFinish(score + (isCorrect ? 100 : 0), coinsEarned + (isCorrect ? 5 : 0));
        } else {
          setCurrentIndex((idx) => idx + 1);
          setSelectedOption(null);
        }
      }, 1300);
    },
    [selectedOption, gameOver, currentQ.correct, currentIndex, questions.length, score, coinsEarned, onFinish],
  );

  const playPronunciation = () => {
    gameAudio.speak(currentQ.item.word);
  };

  const restartGame = () => {
    setQuestions(prepareQuestions(8));
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setCoinsEarned(0);
    setCorrectCount(0);
    setGameOver(false);
  };

  const isNewHighScore = gameOver && score > bestScore;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="size-20 grid place-items-center rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 text-4xl shadow-soft">
          {isNewHighScore ? "🏆" : "🌟"}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            {isNewHighScore ? t("New Best Score!", "নতুন রেকর্ড!") : t("Vocabulary Master!", "শব্দভাণ্ডার চ্যাম্পিয়ন!")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Your word power is getting stronger every day!", "তোমার শব্দভাণ্ডার আরও সমৃদ্ধ হলো!")}
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
              {correctCount}/{questions.length}
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
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground bg-muted/60 px-3.5 py-2.5 rounded-2xl">
        <span className="text-foreground">
          {t("Word", "শব্দ")} {currentIndex + 1}/{questions.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-primary font-black text-sm">{score} pts</span>
          <span className="text-amber-500 font-bold flex items-center gap-0.5">
            <Coins className="size-3.5" />+{coinsEarned}
          </span>
        </div>
      </div>

      {/* Target Word Card */}
      <div className="py-6 px-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 text-center flex flex-col items-center justify-center relative">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
          <Sparkles className="size-3" /> {t("Select correct meaning", "সঠিক অর্থটি বেছে নাও")}
        </span>

        <div className="flex items-center gap-3 justify-center mt-1">
          <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {currentQ.item.word}
          </h3>
          <button
            type="button"
            onClick={playPronunciation}
            className="tap size-10 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all"
            title="Listen to pronunciation"
          >
            <Volume2 className="size-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-1 font-mono">{currentQ.item.ipa}</p>

        {selectedOption !== null && (
          <p className="text-xs italic text-muted-foreground/90 mt-3 max-w-xs bg-card/80 px-3 py-1.5 rounded-xl border border-border animate-in fade-in">
            “{currentQ.item.example}”
          </p>
        )}
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {currentQ.options.map((opt) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === currentQ.correct;
          let btnStyle = "bg-card border-border hover:border-primary/50 text-foreground hover:bg-muted/50";

          if (selectedOption !== null) {
            if (isCorrect) {
              btnStyle = "bg-emerald-500 border-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/20";
            } else if (isSelected) {
              btnStyle = "bg-rose-500 border-rose-600 text-white font-bold shadow-sm shadow-rose-500/20";
            } else {
              btnStyle = "bg-muted/30 border-transparent opacity-40 text-muted-foreground";
            }
          }

          return (
            <button
              key={opt}
              disabled={selectedOption !== null}
              onClick={() => handleSelect(opt)}
              className={`tap p-4 rounded-2xl border-2 text-base font-bold flex items-center justify-between text-left transition-all duration-150 ${btnStyle}`}
            >
              <span>{opt}</span>
              {selectedOption !== null && isCorrect && <CheckCircle2 className="size-5 text-white shrink-0" />}
              {selectedOption !== null && isSelected && !isCorrect && <XCircle className="size-5 text-white shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
