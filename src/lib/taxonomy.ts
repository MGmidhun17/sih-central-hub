export const DOMAINS = [
  "Smart Automation & Transportation",
  "Agriculture, Food Tech & Rural Development",
  "Blockchain & Cybersecurity",
  "MedTech & Healthcare",
  "Clean & Green Technology",
  "Smart Education & E-Learning",
  "AI / ML & Data Science",
  "IoT & Embedded Systems",
] as const;
export const TAXONOMY: Record<string, Record<string, string[]>> = {
  Frontend: {
    React: ["reactjs", "react.js"],
    "Next.js": ["nextjs", "next js"],
    Angular: [],
    Vue: ["vuejs", "vue.js"],
    HTML: ["html5"],
    CSS: ["css3"],
    "Tailwind CSS": ["tailwind"],
  },
  Backend: {
    "Node.js": ["nodejs", "node js"],
    Express: ["expressjs", "express.js"],
    Django: [],
    Flask: [],
    "Spring Boot": ["springboot"],
  },
  "Programming Languages": {
    Java: [],
    Python: [],
    JavaScript: ["js"],
    TypeScript: ["ts"],
    C: [],
    "C++": ["cpp"],
  },
  Database: {
    "Cloud Firestore": ["firestore"],
    "Firebase Realtime Database": ["realtime database"],
    MongoDB: ["mongo"],
    MySQL: [],
    PostgreSQL: ["postgres"],
  },
  "AI / ML": {
    TensorFlow: ["tensorflow.js"],
    PyTorch: [],
    "scikit-learn": ["sklearn"],
    OpenCV: [],
    Gemini: ["gemini api"],
    BERT: [],
    "Sentence-BERT": ["sbert", "sentence bert"],
  },
  NLP: { spaCy: [], NLTK: [], Transformers: ["hugging face transformers"] },
  "IoT / Embedded": { Arduino: [], ESP32: [], "Raspberry Pi": ["raspberrypi"] },
  "Cloud / Deployment": {
    Firebase: [],
    Vercel: [],
    AWS: ["amazon web services"],
    Azure: [],
    "Google Cloud": ["gcp"],
  },
  "Version Control": { Git: [], GitHub: [] },
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function normalizeTechnologies(text: string, candidates: string[] = []) {
  const categories: Record<string, string[]> = {};
  for (const [category, items] of Object.entries(TAXONOMY))
    for (const [name, aliases] of Object.entries(items)) {
      const variants = [name, ...aliases];
      const candidate = candidates.some((c) =>
        variants.some((v) => v.toLowerCase() === c.trim().toLowerCase()),
      );
      const matched = variants.some((v) =>
        new RegExp(`(^|[^a-z0-9+#])${escape(v)}(?=$|[^a-z0-9+#])`, "i").test(
          text,
        ),
      );
      if (candidate || matched) (categories[category] ??= []).push(name);
    }
  return {
    technologies: Object.values(categories).flat(),
    technologyCategories: categories,
  };
}
const hints = [
  ["transport", "traffic", "automation", "vehicle"],
  ["agriculture", "crop", "farm", "irrigation", "food"],
  ["blockchain", "cybersecurity", "encryption", "security"],
  ["health", "medical", "patient", "hospital"],
  ["waste", "recycle", "green", "pollution", "energy"],
  ["student", "education", "learning", "school", "repository"],
  ["machine learning", "data science", "prediction", "neural"],
  ["iot", "embedded", "sensor", "arduino"],
];
export function classifyByRules(text: string) {
  const t = text.toLowerCase();
  const scores = hints.map((h) =>
    h.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0),
  );
  const best = Math.max(...scores);
  return {
    domain: best ? DOMAINS[scores.indexOf(best)] : "",
    domainConfidence: null,
    reason: best
      ? "Suggested from matching domain keywords; teacher review is required."
      : "No confident keyword match. Add more detail or enable Gemini.",
  };
}
export const allTechnologies = Object.values(TAXONOMY).flatMap((x) =>
  Object.keys(x),
);
