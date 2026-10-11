export type Role = "student" | "teacher" | "admin";
export type Status =
  "draft" | "pending" | "changes_requested" | "approved" | "rejected";
export interface Profile {
  uid: string;
  name: string;
  email: string;
  institution: string;
  role: Role;
  approved: boolean;
  rejected?: boolean;
  deleting?: boolean;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
  reviewCount?: number;
}
export interface SimilarProject {
  projectId: string;
  title: string;
  score: number;
}
export interface Analysis {
  technologies: string[];
  technologyCategories: Record<string, string[]>;
  domain: string;
  domainConfidence: number | null;
  reason: string;
  keywords: string[];
  method: "gemini+dictionary" | "dictionary";
  similarityMethod: "TF-IDF cosine (lexical)";
  similarProjects: SimilarProject[];
  analyzedAt: string;
  notice?: string;
}
export interface Project {
  id: string;
  title: string;
  abstract: string;
  description: string;
  githubUrl: string;
  presentationUrl: string;
  demoUrl: string;
  studentId: string;
  studentName: string;
  institution: string;
  status: Status;
  techStack: string[];
  techCategories: Record<string, string[]>;
  sihDomain: string;
  analysis: Analysis | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  revision: number;
}
export interface Review {
  id: string;
  projectId: string;
  studentId: string;
  teacherId: string;
  teacherName: string;
  decision: "approved" | "rejected" | "changes_requested";
  comments: string;
  createdAt: string;
}
export interface ProjectInput {
  title: string;
  abstract: string;
  description: string;
  githubUrl: string;
  presentationUrl: string;
  demoUrl: string;
}
export interface Stats {
  students: number;
  teachers: number;
  pendingTeachers: number;
  projects: number;
  reviews: number;
  statuses: Record<string, number>;
}
