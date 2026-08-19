import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Play, Sparkles, Trophy, ChevronRight, Gamepad2, ArrowLeft } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { student } from "@/lib/mock-data";
import { MathGame } from "@/components/games/MathGame";
import { VocabularyGame } from "@/components/games/VocabularyGame";
import { PuzzleGame } from "@/components/games/PuzzleGame";
import { SpellingGame } from "@/components/games/SpellingGame";
import { MemoryGame } from "@/components/games/MemoryGame";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Learning Games — Wafi" },
      {
        name: "description",
        content: "Math, vocabulary, spelling, puzzle and memory games that make studying fun.",
      },
      { property: "og:title", content: "Learning Games — Wafi" },
      { property: "og:description", content: "Play and learn with coin rewards." },
    ],
  }),
  component: Games,
});

type GameId = "math" | "vocab" | "puzzle" | "spelling" | "memory";

type GameItem = {
  id: GameId;
  emoji: string;
  en: string;
  bn: string;
  descEn: string;
  descBn: string;
  defaultBest: number;
  badgeEn?: string;
  badgeBn?: string;
};

const gamesList: GameItem[] = [
  {
    id: "math",
    emoji: "➗",
    en: "Math Game",
    bn: "গণিত গেম",
    descEn: "Speed mental arithmetic: addition, multiplication & division",
    descBn: "যোগ, বিয়োগ, গুণ ও ভাগের দ্রুত মানসিক গণিত চ্যালেঞ্জ",
    defaultBest: 920,
    badgeEn: "Math Sprint",
    badgeBn: "গণিত দৌড়",
  },
  {
    id: "vocab",
    emoji: "🔤",
    en: "Vocabulary",
    bn: "শব্দ গেম",
    descEn: "Word meanings, definitions and audio pronunciation",
    descBn: "ইংরেজি শব্দের বাংলা অর্থ ও অডিও উচ্চারণ শেখা",
    defaultBest: 780,
    badgeEn: "Word Quiz",
    badgeBn: "শব্দ কুইজ",
  },
  {
    id: "puzzle",
    emoji: "🧩",
    en: "Puzzle",
    bn: "ধাঁধা",
    descEn: "3x3 sliding number tiles brain challenge",
    descBn: "৩x৩ স্লাইডিং নম্বর টাইলস সাজানোর বুদ্ধির খেলা",
    defaultBest: 640,
    badgeEn: "Tile Slide",
    badgeBn: "টাইলস ধাঁধা",
  },
  {
    id: "spelling",
    emoji: "🐝",
    en: "Spelling",
    bn: "বানান",
    descEn: "Spelling bee with pronunciation & letter bank",
    descBn: "উচ্চারণ শুনে অক্ষর সাজিয়ে সঠিক বানান শেখা",
    defaultBest: 1100,
    badgeEn: "Spelling Bee",
    badgeBn: "বানান খেলা",
  },
  {
    id: "memory",
    emoji: "🃏",
    en: "Memory",
    bn: "মেমোরি",
    descEn: "Flip cards and match pairs of learning emojis",
    descBn: "কার্ড উল্টে জোড়া মিলিয়ে স্মৃতিশক্তি পরীক্ষা",
    defaultBest: 540,
    badgeEn: "Card Match",
    badgeBn: "জোড়া মেলাও",
  },
];

function Games() {
  const { t } = useApp();
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [coins, setCoins] = useState(student.coins);
  const [bestScores, setBestScores] = useState<Record<GameId, number>>({
    math: 920,
    vocab: 780,
    puzzle: 640,
    spelling: 1100,
    memory: 540,
  });

  // Load saved coins and best scores from localStorage
  useEffect(() => {
    try {
      const savedCoins = window.localStorage.getItem("wafi.coins");
      if (savedCoins) {
        const parsed = parseInt(savedCoins, 10);
        if (!isNaN(parsed)) setCoins(parsed);
      }

      const savedScores = window.localStorage.getItem("wafi.games.scores");
      if (savedScores) {
        const parsedScores = JSON.parse(savedScores);
        setBestScores((prev) => ({ ...prev, ...parsedScores }));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Listen for Escape key to close active game view
  useEffect(() => {
    if (!activeGameId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveGameId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGameId]);

  const handleFinishGame = (gameId: GameId, score: number, coinsEarned: number) => {
    // Update coins
    if (coinsEarned > 0) {
      setCoins((prev) => {
        const next = prev + coinsEarned;
        window.localStorage.setItem("wafi.coins", String(next));
        return next;
      });
    }

    // Update best score
    setBestScores((prev) => {
      const currentBest = prev[gameId] || 0;
      if (score > currentBest) {
        const next = { ...prev, [gameId]: score };
        window.localStorage.setItem("wafi.games.scores", JSON.stringify(next));
        return next;
      }
      return prev;
    });
  };

  const activeGame = gamesList.find((g) => g.id === activeGameId);

  return (
    <PageShell
      title={t("Games", "গেম")}
      subtitle={t("Learn while playing", "খেলতে খেলতে শেখা")}
      action={<Pill tone="accent">🪙 {coins}</Pill>}
    >
      {/* Banner */}
      <SectionCard className="gradient-hero text-primary-foreground border-none">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">
            🎮
          </span>
          <div className="flex-1">
            <h2 className="text-base font-extrabold leading-tight">
              {t("Play & Earn Coins", "খেলো এবং কয়েন জেতো")}
            </h2>
            <p className="text-xs text-primary-foreground/80 mt-0.5">
              {t(
                "Solve puzzles, master words and sharpen your math skills!",
                "ধাঁধা সমাধান করো, শব্দ শেখো এবং গণিতে দক্ষ হও!",
              )}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Games List */}
      <div className="space-y-3">
        {gamesList.map((g) => {
          const currentBest = bestScores[g.id] ?? g.defaultBest;

          return (
            <SectionCard
              key={g.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lift hover:border-primary/40 active:scale-[0.99] group"
            >
              <div
                onClick={() => setActiveGameId(g.id)}
                className="flex items-center gap-3.5"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveGameId(g.id);
                  }
                }}
              >
                {/* Emoji Icon */}
                <span className="grid size-13 place-items-center rounded-2xl gradient-card text-2xl shadow-soft group-hover:scale-105 transition-transform duration-200 shrink-0">
                  {g.emoji}
                </span>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-extrabold text-foreground truncate">
                      {t(g.en, g.bn)}
                    </p>
                    {g.badgeEn && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        {t(g.badgeEn, g.badgeBn!)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {t(g.descEn, g.descBn)}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground/80 mt-1 flex items-center gap-1">
                    <Trophy className="size-3 text-amber-500" />
                    <span>
                      {t("Best", "সেরা")}: {currentBest}
                    </span>
                  </p>
                </div>

                {/* Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGameId(g.id);
                  }}
                  className="tap shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-soft group-hover:bg-primary/90 transition-all"
                  aria-label={`Play ${g.en}`}
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{t("Play", "খেলো")}</span>
                </button>
              </div>
            </SectionCard>
          );
        })}
      </div>

      {/* Full-screen / Immersive Gameplay View */}
      {activeGame && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] dark:bg-background max-w-[800px] mx-auto overflow-y-auto animate-in fade-in duration-200">
          {/* Clean Top Navigation Bar */}
          <header className="sticky top-4 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 sm:px-6 backdrop-blur shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveGameId(null)}
                className="tap grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-accent/40"
                aria-label={t("Back to games", "গেমে ফিরে যান")}
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">{activeGame.emoji}</span>
                  <h1 className="text-base font-black text-foreground truncate">
                    {t(activeGame.en, activeGame.bn)}
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground truncate hidden xs:block">
                  {t(activeGame.descEn, activeGame.descBn)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Pill tone="accent">🪙 {coins}</Pill>
            </div>
          </header>

          {/* Gameplay Content */}
          <div className="flex-1 w-full max-w-xl mx-auto px-4 py-5 sm:px-6 pb-16">
            {activeGameId === "math" && (
              <MathGame
                bestScore={bestScores.math}
                onFinish={(score, earned) => handleFinishGame("math", score, earned)}
              />
            )}
            {activeGameId === "vocab" && (
              <VocabularyGame
                bestScore={bestScores.vocab}
                onFinish={(score, earned) => handleFinishGame("vocab", score, earned)}
              />
            )}
            {activeGameId === "puzzle" && (
              <PuzzleGame
                bestScore={bestScores.puzzle}
                onFinish={(score, earned) => handleFinishGame("puzzle", score, earned)}
              />
            )}
            {activeGameId === "spelling" && (
              <SpellingGame
                bestScore={bestScores.spelling}
                onFinish={(score, earned) => handleFinishGame("spelling", score, earned)}
              />
            )}
            {activeGameId === "memory" && (
              <MemoryGame
                bestScore={bestScores.memory}
                onFinish={(score, earned) => handleFinishGame("memory", score, earned)}
              />
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}