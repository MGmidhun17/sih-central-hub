import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTechnologies,
  classifyByRules,
} from "../src/lib/taxonomy";
import { similarityService } from "../src/lib/similarity";
import {
  canReadProject,
  canEditProject,
  isAdmin,
  isTeacher,
} from "../src/lib/policy";
import {
  projectSchema,
  registrationSchema,
  reviewSchema,
  geminiSchema,
} from "../src/lib/validation";
import { contentHash } from "../src/lib/server/analysis";
import { student, teacher, admin, pending } from "./fixtures";
const valid = {
  title: "Smart waste management",
  abstract: "Classifies waste images to improve campus recycling.",
  description: "Python OpenCV and Next.js",
  githubUrl: "",
  presentationUrl: "",
  demoUrl: "",
};
test("normalizes aliases, categorizes technologies and removes duplicates", () => {
  const n = normalizeTechnologies(
    "nextjs Next JS Next.js and firestore with Tailwind",
    ["NEXT.JS", "ImaginaryDB"],
  );
  assert.deepEqual(n.technologyCategories.Frontend, [
    "Next.js",
    "Tailwind CSS",
  ]);
  assert.deepEqual(n.technologyCategories.Database, ["Cloud Firestore"]);
  assert(!n.technologies.includes("ImaginaryDB"));
});
test("technology boundaries do not confuse Java/JavaScript or C/C++", () => {
  const n = normalizeTechnologies("JavaScript C++");
  assert(n.technologies.includes("JavaScript"));
  assert(n.technologies.includes("C++"));
  assert(!n.technologies.includes("Java"));
  assert(!n.technologies.includes("C"));
});
test("empty extraction has no technologies and uses provisional Miscellaneous", () => {
  assert.equal(normalizeTechnologies("A novel idea").technologies.length, 0);
  assert.equal(classifyByRules("A novel idea").domain, "Miscellaneous");
});
test("domain inference uses the controlled taxonomy", () => {
  assert.equal(classifyByRules("waste recycle pollution").domain, "Clean & Green Technology");
});
test("identical text ranks above unrelated work and remains bounded", () => {
  const projects = [
    {
      id: "a",
      title: "Waste recycling vision",
      abstract: "camera identifies plastic waste",
      description: "OpenCV classification",
    },
    {
      id: "b",
      title: "Rural irrigation",
      abstract: "moisture controlled watering",
      description: "Arduino soil sensors",
    },
  ];
  const r = similarityService.compare(
    "Waste recycling vision camera identifies plastic waste OpenCV classification",
    projects,
  );
  assert.equal(r[0].projectId, "a");
  assert(r[0].score > 0.99);
  assert(r.every((x) => x.score >= 0 && x.score <= 1));
  assert.deepEqual(similarityService.compare("", projects), []);
});
test("admin access requires the exact configured owner UID and stored role", () => {
  assert(isAdmin(admin, admin.uid));
  assert(!isAdmin(admin, undefined));
  assert(!isAdmin({ ...student, role: "admin" }, admin.uid));
  assert(!isAdmin({ ...admin, deleting: true }, admin.uid));
});
test("pending and deleting teachers cannot review", () => {
  assert(isTeacher(teacher));
  assert(!isTeacher(pending));
  assert(!isTeacher({ ...teacher, deleting: true }));
});
test("private drafts are visible only to owner and admin", () => {
  const p = { status: "draft" as const, studentId: student.uid };
  assert(canReadProject(p, student, admin.uid));
  assert(canReadProject(p, admin, admin.uid));
  assert(!canReadProject(p, teacher, admin.uid));
  assert(!canReadProject(p, null));
  assert(!canReadProject(p, { ...student, uid: "other" }));
});
test("edit policy rejects ownership/status escalation", () => {
  assert(
    canEditProject(
      { status: "changes_requested", studentId: student.uid },
      student,
    ),
  );
  assert(
    !canEditProject({ status: "pending", studentId: student.uid }, student),
  );
  assert(
    !canEditProject({ status: "approved", studentId: student.uid }, student),
  );
  assert(!canEditProject({ status: "draft", studentId: "other" }, student));
  assert(!canEditProject({ status: "draft", studentId: teacher.uid }, teacher));
});
test("approved projects are public; pending projects are not", () => {
  assert(canReadProject({ status: "approved", studentId: "x" }, null));
  assert(!canReadProject({ status: "pending", studentId: "x" }, null));
  assert(canReadProject({ status: "pending", studentId: "x" }, teacher));
  assert(!canReadProject({ status: "pending", studentId: "x" }, pending));
});
test("registration refuses public admin and protected profile fields", () => {
  assert(
    !registrationSchema.safeParse({
      name: "Test",
      institution: "College",
      role: "admin",
    }).success,
  );
  assert(
    !registrationSchema.safeParse({
      name: "Test",
      institution: "College",
      role: "teacher",
      approved: true,
    }).success,
  );
});
test("project validation blocks unsafe URLs and protected field injection", () => {
  assert(projectSchema.safeParse(valid).success);
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
  ])
    assert(!projectSchema.safeParse({ ...valid, demoUrl: url }).success);
  assert(!projectSchema.safeParse({ ...valid, studentId: "other" }).success);
});
test("review and Gemini validation reject invalid decisions and confidence", () => {
  assert(
    !reviewSchema.safeParse({
      decision: "draft",
      comments: "Needs more detail",
      revision: 0,
    }).success,
  );
  assert(
    !geminiSchema.safeParse({
      technologies: [],
      domain: "Anything",
      confidence: 3,
      reason: "x",
      keywords: [],
    }).success,
  );
});
test("analysis cache invalidates content and repository changes but ignores presentation links", () => {
  assert.notEqual(
    contentHash(valid),
    contentHash({ ...valid, description: "Different" }),
  );
  assert.notEqual(contentHash(valid), contentHash({ ...valid, githubUrl: "https://github.com/student/new-repo" }));
  assert.equal(
    contentHash(valid),
    contentHash({ ...valid, demoUrl: "https://example.com/demo" }),
  );
});
