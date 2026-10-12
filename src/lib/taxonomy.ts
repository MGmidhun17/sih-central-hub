export const TAXONOMY_VERSION = "sih-17-v2";
export const DOMAINS = [
  "Smart Automation",
  "Fitness & Sports",
  "Heritage & Culture",
  "MedTech / BioTech / HealthTech",
  "Agriculture, FoodTech & Rural Development",
  "Smart Vehicles",
  "Transportation & Logistics",
  "Robotics and Drones",
  "Clean & Green Technology",
  "Tourism",
  "Renewable / Sustainable Energy",
  "Blockchain & Cybersecurity",
  "Smart Education",
  "Disaster Management",
  "Toys and Games",
  "Miscellaneous",
  "Space Technology"
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
    "C#": ["csharp"],
    Go: ["golang"],
    Rust: [],
    PHP: [],
    Ruby: [],
    Dart: [],
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
  Mobile: { Flutter: [], "React Native": ["react-native"], Kotlin: [], Swift: [] },
  "DevOps / Infrastructure": { Docker: [], Kubernetes: ["k8s"], Terraform: [], "GitHub Actions": [] },
  Testing: { Jest: [], Vitest: [], Pytest: [], Playwright: [], Cypress: [] },
  "Blockchain / Security": { Solidity: [], Ethereum: [], Hyperledger: [], Web3: ["web3.js"] },
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
const hints: readonly string[][] = [
  [
    "automation",
    "automated workflow",
    "process optimization",
    "industrial control",
    "robotic process"
  ],
  [
    "fitness",
    "sports",
    "athlete",
    "workout",
    "exercise"
  ],
  [
    "heritage",
    "culture",
    "cultural",
    "archaeology",
    "historical monument"
  ],
  [
    "health",
    "healthcare",
    "medical",
    "patient",
    "hospital",
    "biotech",
    "diagnosis"
  ],
  [
    "agriculture",
    "crop",
    "farm",
    "farming",
    "irrigation",
    "foodtech",
    "rural",
    "food"
  ],
  [
    "smart vehicle",
    "autonomous vehicle",
    "driver assistance",
    "vehicle diagnostics",
    "electric vehicle",
    "connected car"
  ],
  [
    "transportation",
    "transport",
    "traffic",
    "logistics",
    "delivery route",
    "fleet",
    "public transit"
  ],
  [
    "robotics",
    "robot",
    "robots",
    "drone",
    "drones",
    "unmanned aerial"
  ],
  [
    "waste",
    "recycle",
    "recycling",
    "pollution",
    "environment",
    "clean water",
    "green technology"
  ],
  [
    "tourism",
    "tourist",
    "travel itinerary",
    "travel guide",
    "hospitality"
  ],
  [
    "renewable",
    "solar",
    "wind energy",
    "sustainable energy",
    "energy storage",
    "hydropower"
  ],
  [
    "blockchain",
    "cybersecurity",
    "encryption",
    "phishing",
    "malware",
    "cyber attack"
  ],
  [
    "student",
    "education",
    "learning",
    "school",
    "classroom",
    "e-learning"
  ],
  [
    "disaster",
    "earthquake",
    "flood",
    "wildfire",
    "emergency response",
    "tsunami"
  ],
  [
    "toy",
    "toys",
    "game",
    "games",
    "gaming",
    "puzzle"
  ],
  [],
  [
    "space",
    "satellite",
    "astronomy",
    "orbital",
    "spacecraft",
    "rocket"
  ]
];
export function classifyByRules(text: string) {
  const scores = hints.map(h => h.reduce((n, k) => n + (new RegExp(`(^|[^a-z0-9])${escape(k)}(?=$|[^a-z0-9])`, "i").test(text) ? 1 : 0), 0));
  const best = Math.max(...scores);
  return {
    domain: best ? DOMAINS[scores.indexOf(best)] : "Miscellaneous",
    domainConfidence: null,
    reason: best ? "Suggested from matching SIH domain keywords; teacher review is required." : "No specific SIH domain matched. Miscellaneous is provisional; review the project purpose.",
  };
}
const legacyDomains: Record<string, string> = {
  "Agriculture, Food Tech & Rural Development": "Agriculture, FoodTech & Rural Development",
  "MedTech & Healthcare": "MedTech / BioTech / HealthTech",
  "Smart Education & E-Learning": "Smart Education",
};
export function currentDomain(domain: string, text: string) {
  if (DOMAINS.includes(domain as typeof DOMAINS[number])) return domain;
  return legacyDomains[domain] ?? classifyByRules(text).domain;
}
export const allTechnologies = Object.values(TAXONOMY).flatMap((x) =>
  Object.keys(x),
);
