export interface SubjectBadgeStyle {
  bg: string;
  text: string;
  border: string;
}

export interface CanonicalSubject {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  emoji: string;
  badge: SubjectBadgeStyle;
  aliases: string[];
}

export interface SubjectBadgeMeta {
  emoji: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  nameBn?: string;
  code?: string;
}

/**
 * The Canonical 12 Master Subjects for Wafi Learning Buddy.
 */
export const MASTER_SUBJECTS: CanonicalSubject[] = [
  {
    id: "english-literature",
    name: "English Literature",
    nameBn: "ইংরেজি সাহিত্য",
    code: "ENG-LIT",
    emoji: "📖",
    badge: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100" },
    aliases: [
      "eng lit",
      "literature",
      "english 2nd",
      "english 2nd paper",
      "eng-2",
      "eng 2",
      "english literature",
      "lit",
      "english 2",
      "ইংরেজি সাহিত্য",
      "ইংরেজি ২য়",
      "ইংরেজি ২য় পত্র",
      "ইংরেজি ২",
    ],
  },
  {
    id: "english-language",
    name: "English Language",
    nameBn: "ইংরেজি ভাষা",
    code: "ENG-LANG",
    emoji: "🔤",
    badge: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    aliases: [
      "eng lang",
      "language",
      "english 1st",
      "english 1st paper",
      "english",
      "eng-1",
      "eng 1",
      "english language",
      "eng",
      "english 1",
      "ইংরেজি",
      "ইংরেজি ১ম",
      "ইংরেজি ১ম পত্র",
      "ইংরেজি ভাষা",
      "ইংরেজি ১",
    ],
  },
  {
    id: "science",
    name: "Science",
    nameBn: "বিজ্ঞান",
    code: "SCI",
    emoji: "🔬",
    badge: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    aliases: [
      "general science",
      "gen sci",
      "sci",
      "বিজ্ঞান",
      "science",
      "gen science",
      "gs",
      "সাধারণ বিজ্ঞান",
      "elementary science",
    ],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    nameBn: "গণিত",
    code: "MTH",
    emoji: "📐",
    badge: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    aliases: [
      "maths",
      "math",
      "general math",
      "গণিত",
      "অংক",
      "mth",
      "mathematics",
      "math 1",
      "math-1",
      "ম্যাথ",
      "matematics",
      "mathmatics",
      "mathmetics",
    ],
  },
  {
    id: "social-studies",
    name: "Social Studies",
    nameBn: "বাংলাদেশ ও বিশ্বপরিচয়",
    code: "BGS",
    emoji: "🌏",
    badge: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    aliases: [
      "bgs",
      "bangladesh and global studies",
      "social science",
      "সমাজ",
      "বাংলাদেশ ও বিশ্বপরিচয়",
      "social studies",
      "b.g.s",
      "b.g.s.",
      "bangladesh & global studies",
      "বাংলাদেশ",
      "বিজিএস",
      "soc",
      "ss",
    ],
  },
  {
    id: "computer-science",
    name: "Computer Science",
    nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি",
    code: "CS",
    emoji: "💻",
    badge: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    aliases: [
      "cs",
      "computer",
      "ict",
      "it",
      "তথ্য ও যোগাযোগ প্রযুক্তি",
      "computer science",
      "i.c.t",
      "i.c.t.",
      "comp",
      "c.s",
      "তথ্য প্রযুক্তি",
      "কম্পিউটার",
      "আইসিটি",
    ],
  },
  {
    id: "bangla",
    name: "Bangla",
    nameBn: "বাংলা ১ম পত্র",
    code: "BAN",
    emoji: "📕",
    badge: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
    aliases: [
      "bangla 1st",
      "bangla 1st paper",
      "bengali",
      "বাংলা",
      "বাংলা ১ম",
      "bangla",
      "bangla 1",
      "bangla-1",
      "ban 1",
      "ban-1",
      "bengali 1",
      "bengali 1st",
      "বাংলা ১ম পত্র",
      "বাংলা ১",
    ],
  },
  {
    id: "bangla-2",
    name: "Bangla 2nd Paper",
    nameBn: "বাংলা ২য় পত্র",
    code: "BAN2",
    emoji: "✍️",
    badge: { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100" },
    aliases: [
      "bangla 2nd",
      "bangla grammar",
      "বাংলা ২য়",
      "বাংলা ২য় পত্র",
      "বাংলা ব্যাকরণ",
      "bangla 2nd paper",
      "bangla 2",
      "bangla-2",
      "ban 2",
      "ban-2",
      "bengali 2",
      "bengali 2nd",
      "বাংলা ২",
    ],
  },
  {
    id: "geography",
    name: "Geography",
    nameBn: "ভূগোল",
    code: "GEO",
    emoji: "🗺️",
    badge: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100" },
    aliases: ["geo", "ভূগোল", "geography", "geog"],
  },
  {
    id: "islamic-studies",
    name: "Islamic Studies",
    nameBn: "ইসলাম শিক্ষা",
    code: "ISL",
    emoji: "🕌",
    badge: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100" },
    aliases: [
      "islam",
      "islam & moral education",
      "religion",
      "ধর্ম",
      "ইসলাম শিক্ষা",
      "দ্বীন",
      "islamic studies",
      "islam and moral education",
      "religious studies",
      "moral education",
      "ইসলাম",
      "ইসলাম ও নৈতিক শিক্ষা",
      "quran",
      "deenyat",
      "দ্বীনিয়াত",
    ],
  },
  {
    id: "arabic",
    name: "Arabic",
    nameBn: "আরবি",
    code: "ARB",
    emoji: "🌙",
    badge: { bg: "bg-lime-50", text: "text-lime-600", border: "border-lime-100" },
    aliases: ["arab", "আরবি", "arabic", "আরবী"],
  },
  {
    id: "history",
    name: "History",
    nameBn: "ইতিহাস",
    code: "HIS",
    emoji: "🏛️",
    badge: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
    aliases: ["itihas", "ইতিহাস", "history", "hist"],
  },
];

export const CANONICAL_SUBJECT_NAMES: string[] = MASTER_SUBJECTS.map((s) => s.name);

// Fast alias map for O(1) canonical lookups
const ALIAS_MAP = new Map<string, string>();

for (const sub of MASTER_SUBJECTS) {
  // Map canonical name itself (case-insensitive)
  ALIAS_MAP.set(sub.name.toLowerCase().trim(), sub.name);
  ALIAS_MAP.set(sub.nameBn.toLowerCase().trim(), sub.name);
  ALIAS_MAP.set(sub.code.toLowerCase().trim(), sub.name);

  // Map all defined aliases
  for (const alias of sub.aliases) {
    const cleanedAlias = alias.toLowerCase().trim();
    if (cleanedAlias) {
      ALIAS_MAP.set(cleanedAlias, sub.name);
    }
  }
}

/**
 * Normalizes any fallback/custom subject string into Title Case while preserving standard acronyms.
 */
function normalizeFallbackCase(subject: string): string {
  if (!subject) return "";
  const cleaned = subject.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const acronyms = new Set(["ICT", "PE", "GK", "IT", "AI", "BGS", "B.G.S", "PT", "CS"]);
  const minorWords = new Set(["and", "or", "of", "in", "on", "at", "to", "for", "with", "a", "an", "the", "&"]);

  const words = cleaned.split(" ");
  const normalizedWords = words.map((word, index) => {
    if (word === "&") return "&";
    const upperWord = word.toUpperCase();
    if (acronyms.has(upperWord)) return upperWord;

    const lowerWord = word.toLowerCase();
    if (index > 0 && minorWords.has(lowerWord)) return lowerWord;

    if (word.includes("-")) {
      return word
        .split("-")
        .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
        .join("-");
    }
    if (word.includes("/")) {
      return word
        .split("/")
        .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
        .join("/");
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return normalizedWords.join(" ");
}

/**
 * Strips section tags like (Neon), (H & N), (Helium+Neon), [Helium], [N], etc. from a raw subject string.
 */
export function stripSectionTags(rawSubject: string): string {
  if (!rawSubject) return "";
  let s = rawSubject;

  // Strip parenthesized or bracketed section tags
  // e.g. (Neon), (N), (Helium), (H), (H & N), (H+N), (Helium+Neon), (Helium & Neon), (All), (Both), (Helium only), (Neon only)
  s = s.replace(
    /\s*[\(\[]\s*(helium\s*(&|\+|and|,|\/)\s*neon|neon\s*(&|\+|and|,|\/)\s*helium|h\s*(&|\+|and|,|\/)\s*n|n\s*(&|\+|and|,|\/)\s*h|helium\s*only|neon\s*only|helium|neon|all|both|h|n)\s*[\)\]]\s*/gi,
    " "
  );

  // Strip standalone section tags like " - Neon", " - Helium", "Section: Neon", "Sec: Helium+Neon", etc.
  s = s.replace(
    /\s*[-–—|:]?\s*\b(?:sec(?:tion)?\s*[:\-]?)?\s*(?:helium\s*(&|\+|and|,|\/)\s*neon|neon\s*(&|\+|and|,|\/)\s*helium|helium\s+section|neon\s+section|section\s+helium|section\s+neon|helium\s*only|neon\s*only)\b\s*/gi,
    " "
  );

  // Clean remaining empty brackets/parentheses and extra punctuation
  s = s.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "");
  s = s.trim().replace(/^[:\-–—|#\s]+/, "").replace(/[:\-–—|#\s]+$/, "").trim();

  return s;
}

/**
 * Resolves any raw subject string (e.g. from pasted diary, OCR, forms, or legacy db records)
 * to its single canonical Master Subject name.
 *
 * Examples:
 * - "Mathematics (Neon)" -> "Mathematics"
 * - "math" -> "Mathematics"
 * - "eng lit" -> "English Literature"
 * - "eng lang" -> "English Language"
 * - "bgs" -> "Social Studies"
 * - "cs" -> "Computer Science"
 * - "Bangla 1st" -> "Bangla"
 * - "Bangla 2nd" -> "Bangla 2nd Paper"
 * - "geo" -> "Geography"
 * - "itihas" -> "History"
 * - "arab" -> "Arabic"
 */
export function resolveCanonicalSubject(input: string): string {
  if (!input) return "General";

  // First strip section annotations and boundary punctuation
  const cleaned = stripSectionTags(input);

  if (!cleaned) return "General";

  const lower = cleaned.toLowerCase();

  // 1. Direct O(1) exact alias match
  if (ALIAS_MAP.has(lower)) {
    return ALIAS_MAP.get(lower)!;
  }

  // 2. Specific multi-word / substring heuristics
  if (lower.includes("geo") || lower.includes("ভূগোল")) {
    return "Geography";
  }

  if (lower.includes("itihas") || lower.includes("ইতিহাস") || lower.includes("history")) {
    return "History";
  }

  if (lower.includes("arabic") || lower.includes("arab") || lower.includes("আরবি") || lower.includes("আরবী")) {
    return "Arabic";
  }

  if (lower.includes("math") || lower.includes("গণিত") || lower.includes("অংক") || lower === "mth") {
    return "Mathematics";
  }

  if (lower.includes("bangla") || lower.includes("bengali") || lower.includes("বাংলা")) {
    if (
      lower.includes("2") ||
      lower.includes("২") ||
      lower.includes("grammar") ||
      lower.includes("ব্যাকরণ") ||
      lower.includes("second") ||
      lower.includes("2nd")
    ) {
      return "Bangla 2nd Paper";
    }
    return "Bangla";
  }

  if (
    lower.includes("english") ||
    lower.includes("ইংরেজি") ||
    lower.startsWith("eng") ||
    lower.includes("literature") ||
    lower.includes("lit")
  ) {
    if (
      lower.includes("2") ||
      lower.includes("২") ||
      lower.includes("lit") ||
      lower.includes("literature") ||
      lower.includes("second") ||
      lower.includes("2nd")
    ) {
      return "English Literature";
    }
    return "English Language";
  }

  if (lower.includes("science") || lower.includes("বিজ্ঞান") || lower === "sci" || lower === "gen sci") {
    return "Science";
  }

  if (
    lower.includes("bgs") ||
    lower.includes("social") ||
    lower.includes("সমাজ") ||
    lower.includes("বাংলাদেশ") ||
    lower.includes("global studies")
  ) {
    return "Social Studies";
  }

  if (
    lower.includes("cs") ||
    lower.includes("ict") ||
    lower.includes("computer") ||
    lower.includes("কম্পিউটার") ||
    lower.includes("তথ্য") ||
    lower.includes("যোগাযোগ") ||
    lower === "it"
  ) {
    return "Computer Science";
  }

  if (
    lower.includes("islam") ||
    lower.includes("religion") ||
    lower.includes("ধর্ম") ||
    lower.includes("ইসলাম") ||
    lower.includes("quran") ||
    lower.includes("কুরআন") ||
    lower.includes("দ্বীন") ||
    lower.includes("moral")
  ) {
    return "Islamic Studies";
  }

  // 3. Fallback: Clean Title Case
  return normalizeFallbackCase(cleaned) || "General";
}

/**
 * Provides filtered canonical subject suggestions for search/combobox inputs.
 * Matches against canonical English names, Bengali names, codes, and all aliases.
 */
export function getSubjectSuggestions(query: string): CanonicalSubject[] {
  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) {
    return MASTER_SUBJECTS;
  }

  return MASTER_SUBJECTS.filter((sub) => {
    if (sub.name.toLowerCase().includes(trimmed)) return true;
    if (sub.nameBn.toLowerCase().includes(trimmed)) return true;
    if (sub.code.toLowerCase().includes(trimmed)) return true;
    return sub.aliases.some((alias) => alias.toLowerCase().includes(trimmed));
  });
}

/**
 * Returns complete styling & emoji metadata for any subject string.
 */
export function getSubjectMeta(subjectName: string): SubjectBadgeMeta {
  const canonical = resolveCanonicalSubject(subjectName);
  const found = MASTER_SUBJECTS.find((s) => s.name.toLowerCase() === canonical.toLowerCase());

  if (found) {
    return {
      emoji: found.emoji,
      bgClass: found.badge.bg,
      textClass: found.badge.text,
      borderClass: found.badge.border,
      nameBn: found.nameBn,
      code: found.code,
    };
  }

  return {
    emoji: "📚",
    bgClass: "bg-slate-50",
    textClass: "text-slate-700",
    borderClass: "border-slate-200",
  };
}
