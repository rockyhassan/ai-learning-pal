import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";
import { BottomNav, LangToggle } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/ai-teacher")({
  head: () => ({
    meta: [
      { title: "AI Teacher — Wafi" },
      { name: "description", content: "A student-friendly AI teacher that explains lessons in Bangla and English and makes quizzes." },
      { property: "og:title", content: "AI Teacher — Wafi" },
      { property: "og:description", content: "Ask anything and get a kid-friendly explanation." },
    ],
  }),
  component: AiTeacher,
});

type Msg = { role: "ai" | "me"; text: string };

const prompts = [
  { en: "Explain this.", bn: "এটা ব্যাখ্যা করো।" },
  { en: "Explain in Bangla.", bn: "বাংলায় বুঝাও।" },
  { en: "Make it easier.", bn: "আরও সহজ করো।" },
  { en: "Generate MCQ.", bn: "MCQ বানাও।" },
  { en: "Generate Quiz.", bn: "কুইজ বানাও।" },
  { en: "Generate Flashcard.", bn: "ফ্ল্যাশকার্ড বানাও।" },
];

function AiTeacher() {
  const { t } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi Wafi! 👋 I'm your AI teacher. Ask me anything about today's lesson — I can explain in English or Bangla.",
    },
  ]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "me", text },
      {
        role: "ai",
        text: "Great question! Here is the simple idea, then an example, then a small practice question. (Demo reply — AI connects once the backend is turned on.)",
      },
    ]);
    setInput("");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-background pb-28">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur shadow-sm">
        <span className="grid size-10 place-items-center rounded-2xl gradient-hero text-lg">🤖</span>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">{t("AI Teacher", "এআই শিক্ষক")}</h1>
          <p className="text-xs text-muted-foreground">{t("Always ready to help", "সবসময় সাহায্যে আছি")}</p>
        </div>
        <LangToggle />
      </header>

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`animate-pop max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "ai"
                ? "rounded-bl-lg bg-card text-card-foreground shadow-soft"
                : "ml-auto rounded-br-lg bg-primary text-primary-foreground"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="sticky bottom-20 space-y-2 bg-background/95 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {prompts.map((p) => (
            <button
              key={p.en}
              onClick={() => send(t(p.en, p.bn))}
              className="tap shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-soft"
            >
              {t(p.en, p.bn)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("Type your question…", "তোমার প্রশ্ন লেখো…")}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button type="submit" className="tap grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Send className="size-4" />
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}