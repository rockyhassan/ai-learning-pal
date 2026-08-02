import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageShell, Pill, SectionCard } from "@/components/app-shell";
import { useApp } from "@/lib/app-state";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/study/$subject")({
  head: ({ params }) => {
    const s = subjects.find((x) => x.slug === params.subject);
    const name = s ? s.en : "Subject";
    return {
      meta: [
        { title: `${name} Chapters — Wafi` },
        { name: "description", content: `Chapters and lessons for ${name}, with Bangla explanations and practice.` },
        { property: "og:title", content: `${name} Chapters — Wafi` },
        { property: "og:description", content: `Study ${name} chapter by chapter.` },
      ],
    };
  },
  loader: ({ params }) => {
    const subject = subjects.find((s) => s.slug === params.subject);
    if (!subject) throw notFound();
    return subject;
  },
  component: SubjectPage,
});

function SubjectPage() {
  const subject = Route.useLoaderData();
  const { t, lang } = useApp();

  return (
    <PageShell
      title={`${subject.emoji} ${lang === "bn" ? subject.bn : subject.en}`}
      subtitle={`${subject.progress}% ${t("complete", "সম্পন্ন")}`}
      back="/study"
    >
      {subject.chapters.map((c) => (
        <SectionCard
          key={c.id}
          title={`${t("Chapter", "অধ্যায়")} ${c.id}`}
          hint={
            <Pill tone={c.done === c.lessons.length ? "success" : "warning"}>
              {c.done}/{c.lessons.length}
            </Pill>
          }
        >
          <p className="mb-3 text-sm font-bold">{lang === "bn" ? c.bn : c.en}</p>
          <ul className="space-y-2">
            {c.lessons.map((lesson, i) => (
              <li key={lesson}>
                <Link
                  to="/lesson/$lessonId"
                  params={{ lessonId: `${subject.slug}-${c.id}-${i + 1}` }}
                  className="tap flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{lesson}</span>
                  {i < c.done ? <Pill tone="success">✓</Pill> : null}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </PageShell>
  );
}