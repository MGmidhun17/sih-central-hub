import type {
  Profile,
  Project,
  Review,
  ProjectInput,
  Analysis,
  Role,
} from "./types";
import { normalizeTechnologies, classifyByRules, DOMAINS } from "./taxonomy";
import { similarityService, tokens } from "./similarity";
export const demoProfiles: Profile[] = [
  {
    uid: "demo-student",
    name: "Midhun M G",
    email: "student@example.test",
    institution: "Bannari Amman Institute of Technology",
    role: "student",
    approved: true,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-01T09:00:00Z",
  },
  {
    uid: "demo-teacher",
    name: "Dr. Ananya Rao",
    email: "teacher@example.test",
    institution: "Bannari Amman Institute of Technology",
    role: "teacher",
    approved: true,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-01T09:00:00Z",
  },
  {
    uid: "demo-admin",
    name: "Project Owner",
    email: "admin@example.test",
    institution: "HackRepo",
    role: "admin",
    approved: true,
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-01T09:00:00Z",
  },
  {
    uid: "demo-pending",
    name: "Kavya S",
    email: "kavya@example.test",
    institution: "Department of Information Technology",
    role: "teacher",
    approved: false,
    createdAt: "2026-10-10T09:00:00Z",
    updatedAt: "2026-10-10T09:00:00Z",
  },
];
const examples = [
  [
    "Vision for a cleaner campus",
    "A computer-vision waste sorting system that identifies recyclable materials and helps campuses reduce landfill waste.",
    "Python, OpenCV and TensorFlow classify waste images. An ESP32 sensor monitors bin fill levels. A Next.js dashboard on Firebase shows collection priorities.",
    4,
    "approved",
  ],
  [
    "Every drop counts",
    "An intelligent irrigation assistant that helps small farms water crops according to soil conditions and conserve water.",
    "Arduino soil moisture sensors send readings to Firebase. A React dashboard displays field status and helps farmers schedule irrigation.",
    1,
    "approved",
  ],
  [
    "Learning without barriers",
    "An accessible learning companion that helps rural students find lessons and learn at their own pace, even with intermittent connectivity.",
    "Next.js and Tailwind CSS provide an accessible interface. Cloud Firestore stores progress, and Gemini helps classify learning material.",
    5,
    "approved",
  ],
  [
    "Campus Care Connect",
    "A student wellbeing platform that makes it easier to discover mental health resources and request support from campus counsellors.",
    "React and Node.js deliver a private support portal with PostgreSQL. Python powers aggregate trend reports without exposing individual health records.",
    3,
    "pending",
  ],
  [
    "Verified by design",
    "A tamper-evident certificate verification portal that lets institutions issue credentials and graduates share a verifiable record.",
    "Next.js and TypeScript present verification records. A blockchain stores credential hashes while Firebase stores metadata.",
    2,
    "approved",
  ],
  [
    "Smarter waste collection",
    "A waste monitoring application that predicts full campus bins and helps maintenance teams plan collection routes.",
    "Python and OpenCV classify waste. ESP32 sensors report fill levels to Firebase. React displays recycling statistics and bin alerts.",
    4,
    "draft",
  ],
] as const;
export const demoProjects: Project[] = examples.map(
  ([title, abstract, description, d, status], i) => {
    const n = normalizeTechnologies(description);
    return {
      id: `sample-${i + 1}`,
      title,
      abstract,
      description,
      githubUrl: "",
      presentationUrl: "",
      demoUrl: "",
      studentId: i === 1 || i === 4 ? "sample-author" : "demo-student",
      studentName: i === 1 ? "Pranesh R" : i === 4 ? "Arun K" : "Midhun M G",
      institution: "Bannari Amman Institute of Technology",
      status,
      techStack: n.technologies,
      techCategories: n.technologyCategories,
      sihDomain: DOMAINS[d],
      analysis: null,
      createdAt: `2026-10-0${i + 1}T09:00:00Z`,
      updatedAt: `2026-10-0${i + 1}T09:00:00Z`,
      submittedAt: status === "draft" ? null : `2026-10-0${i + 1}T09:00:00Z`,
      revision: 0,
    };
  },
);
export interface DemoState {
  users: Profile[];
  projects: Project[];
  reviews: Review[];
}
export function initialDemo(): DemoState {
  return { users: demoProfiles, projects: demoProjects, reviews: [] };
}
export function demoAnalyze(
  p: ProjectInput,
  projects: Project[],
  exclude?: string,
): Analysis {
  const text = `${p.title} ${p.abstract} ${p.description}`;
  return {
    ...normalizeTechnologies(text),
    ...classifyByRules(text),
    keywords: [...new Set(tokens(text))].slice(0, 10),
    method: "dictionary",
    similarityMethod: "TF-IDF cosine (lexical)",
    similarProjects: similarityService.compare(
      text,
      projects.filter((x) => x.status === "approved" && x.id !== exclude),
    ),
    analyzedAt: new Date().toISOString(),
    notice:
      "Demo: dictionary tagging and lexical similarity run in your browser. No Gemini request was made.",
  };
}
export function profileForRole(role: Role) {
  return demoProfiles.find((u) => u.role === role)!;
}
