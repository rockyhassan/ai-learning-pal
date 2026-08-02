export type Subject = {
  slug: string;
  en: string;
  bn: string;
  emoji: string;
  progress: number;
  chapters: { id: number; en: string; bn: string; lessons: string[]; done: number }[];
};

export const student = {
  name: "Wafi Rahman",
  nickname: "Wafi",
  className: "Class 4",
  section: "A",
  roll: "07",
  school: "Sunrise Model School",
  board: "NCTB",
  medium: "English",
  birthday: "2016-04-12",
  streak: 12,
  coins: 1240,
  stars: 86,
  level: 7,
};

export const subjects: Subject[] = [
  {
    slug: "english",
    en: "English",
    bn: "ইংরেজি",
    emoji: "🔤",
    progress: 68,
    chapters: [
      {
        id: 1,
        en: "Greetings & Introduction",
        bn: "সম্ভাষণ ও পরিচয়",
        done: 3,
        lessons: ["Saying Hello", "Introducing Yourself", "Polite Words", "Practice Talk"],
      },
      {
        id: 2,
        en: "My Family",
        bn: "আমার পরিবার",
        done: 2,
        lessons: ["Family Words", "Describing People", "Reading: At Home"],
      },
      {
        id: 3,
        en: "Tenses Made Easy",
        bn: "সহজ কাল",
        done: 0,
        lessons: ["Present Simple", "Past Simple", "Future Simple", "Mixed Practice"],
      },
    ],
  },
  {
    slug: "bangla",
    en: "Bangla",
    bn: "বাংলা",
    emoji: "📕",
    progress: 74,
    chapters: [
      { id: 1, en: "কবিতা: আমার দেশ", bn: "কবিতা: আমার দেশ", done: 2, lessons: ["পাঠ", "শব্দার্থ", "প্রশ্নোত্তর"] },
      { id: 2, en: "গদ্য: নদীর গল্প", bn: "গদ্য: নদীর গল্প", done: 1, lessons: ["পাঠ", "ব্যাখ্যা", "অনুশীলন"] },
      { id: 3, en: "ব্যাকরণ", bn: "ব্যাকরণ", done: 0, lessons: ["সন্ধি", "সমাস", "বিরামচিহ্ন"] },
    ],
  },
  {
    slug: "math",
    en: "Math",
    bn: "গণিত",
    emoji: "➗",
    progress: 52,
    chapters: [
      { id: 1, en: "Multiplication", bn: "গুণ", done: 3, lessons: ["Tables 2-5", "Tables 6-9", "Word Problems"] },
      { id: 2, en: "Division", bn: "ভাগ", done: 1, lessons: ["Simple Division", "Remainders", "Practice"] },
      { id: 3, en: "Fractions", bn: "ভগ্নাংশ", done: 0, lessons: ["What is a Fraction", "Compare", "Add & Subtract"] },
    ],
  },
  {
    slug: "science",
    en: "Science",
    bn: "বিজ্ঞান",
    emoji: "🔬",
    progress: 61,
    chapters: [
      { id: 1, en: "Living Things", bn: "জীব", done: 2, lessons: ["Plants", "Animals", "Habitats"] },
      { id: 2, en: "Matter", bn: "পদার্থ", done: 1, lessons: ["Solid Liquid Gas", "Changes", "Experiments"] },
      { id: 3, en: "Our Earth", bn: "আমাদের পৃথিবী", done: 0, lessons: ["Weather", "Water Cycle", "Seasons"] },
    ],
  },
  {
    slug: "bgs",
    en: "BGS",
    bn: "বাংলাদেশ ও বিশ্বপরিচয়",
    emoji: "🌏",
    progress: 44,
    chapters: [
      { id: 1, en: "Our Country", bn: "আমাদের দেশ", done: 1, lessons: ["Map of Bangladesh", "Divisions", "Rivers"] },
      { id: 2, en: "Our Heroes", bn: "আমাদের বীরেরা", done: 0, lessons: ["Language Movement", "Liberation War"] },
    ],
  },
  {
    slug: "ict",
    en: "ICT",
    bn: "তথ্য ও যোগাযোগ প্রযুক্তি",
    emoji: "💻",
    progress: 39,
    chapters: [
      { id: 1, en: "Computer Basics", bn: "কম্পিউটার পরিচিতি", done: 1, lessons: ["Parts", "Input & Output", "Safety"] },
      { id: 2, en: "Internet", bn: "ইন্টারনেট", done: 0, lessons: ["What is Internet", "Safe Browsing"] },
    ],
  },
  {
    slug: "religion",
    en: "Religion",
    bn: "ধর্ম",
    emoji: "🕌",
    progress: 58,
    chapters: [
      { id: 1, en: "Good Manners", bn: "সুন্দর আচরণ", done: 2, lessons: ["Honesty", "Respect", "Kindness"] },
      { id: 2, en: "Daily Duas", bn: "দৈনন্দিন দোয়া", done: 1, lessons: ["Morning", "Before Meal", "Sleeping"] },
    ],
  },
  {
    slug: "drawing",
    en: "Drawing",
    bn: "চিত্রাঙ্কন",
    emoji: "🎨",
    progress: 80,
    chapters: [
      { id: 1, en: "Shapes & Colors", bn: "আকৃতি ও রং", done: 3, lessons: ["Basic Shapes", "Color Mixing", "Shading"] },
    ],
  },
  {
    slug: "gk",
    en: "General Knowledge",
    bn: "সাধারণ জ্ঞান",
    emoji: "🧠",
    progress: 35,
    chapters: [
      { id: 1, en: "Around the World", bn: "বিশ্ব পরিচয়", done: 1, lessons: ["Countries", "Flags", "Capitals"] },
    ],
  },
];

export const homework = [
  {
    id: "hw-1",
    subject: "English",
    title: "Write 5 sentences about your family",
    titleBn: "পরিবার নিয়ে ৫টি বাক্য লেখো",
    due: "Today 8:00 PM",
    status: "pending" as const,
  },
  {
    id: "hw-2",
    subject: "Math",
    title: "Exercise 3.2 — Question 1 to 8",
    titleBn: "অনুশীলনী ৩.২ — প্রশ্ন ১-৮",
    due: "Today 9:00 PM",
    status: "pending" as const,
  },
  {
    id: "hw-3",
    subject: "Science",
    title: "Draw the water cycle",
    titleBn: "পানিচক্রের চিত্র আঁকো",
    due: "Tomorrow",
    status: "completed" as const,
  },
  {
    id: "hw-4",
    subject: "Bangla",
    title: "কবিতা মুখস্থ — প্রথম ৮ লাইন",
    titleBn: "কবিতা মুখস্থ — প্রথম ৮ লাইন",
    due: "Today",
    status: "completed" as const,
  },
];

export const routine = [
  { time: "08:00", subject: "Assembly", teacher: "—", room: "Field" },
  { time: "08:30", subject: "English", teacher: "Ms. Nabila", room: "4A" },
  { time: "09:20", subject: "Math", teacher: "Mr. Rafiq", room: "4A" },
  { time: "10:10", subject: "Break", teacher: "—", room: "—" },
  { time: "10:40", subject: "Science", teacher: "Ms. Tania", room: "Lab 1" },
  { time: "11:30", subject: "Bangla", teacher: "Mr. Kamal", room: "4A" },
  { time: "12:20", subject: "ICT", teacher: "Ms. Rumi", room: "Lab 2" },
];

export const exams = [
  { name: "Math Class Test", date: "in 3 days", chapter: "Chapter 3: Fractions", days: 3 },
  { name: "English Mid Term", date: "in 11 days", chapter: "Chapter 1-3", days: 11 },
  { name: "Science Quiz", date: "in 18 days", chapter: "Living Things", days: 18 },
];

export const vocabulary = [
  { word: "Curious", bn: "কৌতূহলী", ipa: "/ˈkjʊəriəs/", example: "Wafi is curious about stars." },
  { word: "Brave", bn: "সাহসী", ipa: "/breɪv/", example: "The brave boy helped his friend." },
  { word: "Harvest", bn: "ফসল কাটা", ipa: "/ˈhɑːvɪst/", example: "Farmers harvest rice in winter." },
  { word: "Journey", bn: "যাত্রা", ipa: "/ˈdʒɜːni/", example: "Our journey to the village was fun." },
  { word: "Gentle", bn: "কোমল", ipa: "/ˈdʒentl/", example: "She has a gentle voice." },
];

export const weeklyProgress = [
  { day: "Sat", minutes: 32, score: 72 },
  { day: "Sun", minutes: 41, score: 78 },
  { day: "Mon", minutes: 25, score: 65 },
  { day: "Tue", minutes: 48, score: 84 },
  { day: "Wed", minutes: 36, score: 80 },
  { day: "Thu", minutes: 52, score: 91 },
  { day: "Fri", minutes: 18, score: 70 },
];

export const monthlyProgress = [
  { week: "W1", score: 68 },
  { week: "W2", score: 74 },
  { week: "W3", score: 71 },
  { week: "W4", score: 83 },
];

export const teachers = [
  { name: "Ms. Nabila Haque", subject: "English", phone: "01700-000001" },
  { name: "Mr. Rafiqul Islam", subject: "Math", phone: "01700-000002" },
  { name: "Ms. Tania Akter", subject: "Science", phone: "01700-000003" },
  { name: "Mr. Kamal Hossain", subject: "Bangla", phone: "01700-000004" },
];

export const aiMemory = [
  { label: "Strong at", labelBn: "ভালো পারে", items: ["Multiplication tables", "Bangla reading", "Drawing"], tone: "success" },
  { label: "Weak at", labelBn: "দুর্বল", items: ["Fractions", "Past tense", "Spelling long words"], tone: "warning" },
  { label: "Pronunciation trouble", labelBn: "উচ্চারণে সমস্যা", items: ["thirsty", "world", "vegetable"], tone: "info" },
  { label: "Forgets often", labelBn: "ভুলে যায়", items: ["Water cycle steps", "Division remainder rule"], tone: "destructive" },
];

export const achievements = [
  { emoji: "🔥", name: "12 Day Streak", nameBn: "১২ দিনের ধারা" },
  { emoji: "📖", name: "Bookworm", nameBn: "বইপোকা" },
  { emoji: "🎯", name: "Quiz Master", nameBn: "কুইজ মাস্টার" },
  { emoji: "🗣️", name: "Clear Speaker", nameBn: "স্পষ্ট উচ্চারণ" },
  { emoji: "⏱️", name: "Early Bird", nameBn: "সকালের পাখি" },
  { emoji: "🏅", name: "Level 7", nameBn: "লেভেল ৭" },
];