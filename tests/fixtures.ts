import type { Profile, Project } from "../src/lib/types";
const timestamp = "2026-01-01T00:00:00.000Z";
const base: Profile = { uid: "test-student", name: "Test Student", email: "student@example.test", institution: "Test College", role: "student", approved: true, createdAt: timestamp, updatedAt: timestamp };
export const student = base;
export const teacher: Profile = { ...base, uid: "test-teacher", role: "teacher" };
export const admin: Profile = { ...base, uid: "test-admin", role: "admin" };
export const pending: Profile = { ...teacher, uid: "test-pending", approved: false };
export const project: Project = { id: "test-project", title: "Test classroom tool", abstract: "Student lessons for classroom practice.", description: "A learning application", githubUrl: "", presentationUrl: "", demoUrl: "", studentId: base.uid, studentName: base.name, institution: base.institution, status: "approved", techStack: [], techCategories: {}, sihDomain: "Smart Education", analysis: null, createdAt: timestamp, updatedAt: timestamp, submittedAt: timestamp, revision: 0 };
