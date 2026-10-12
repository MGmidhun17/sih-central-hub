import { z } from "zod";
import { DOMAINS } from "./taxonomy";
const url = z
  .string()
  .trim()
  .max(2048)
  .refine((s) => {
    if (!s) return true;
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS URL without credentials.");
export const projectSchema = z
  .object({
    title: z.string().trim().min(5).max(160),
    abstract: z.string().trim().min(30).max(2000),
    description: z.string().trim().max(12000),
    githubUrl: url,
    presentationUrl: url,
    demoUrl: url,
  })
  .strict();
export const saveSchema = projectSchema.extend({
  status: z.enum(["draft", "pending"]),
  revision: z.number().int().min(0).optional(),
});
export const analysisSchema = projectSchema.extend({
  excludeProjectId: z.string().max(128).optional(),
});
export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    institution: z.string().trim().min(2).max(160),
    role: z.enum(["student", "teacher"]),
  })
  .strict();
export const reviewSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "changes_requested"]),
    comments: z.string().trim().min(10).max(3000),
    revision: z.number().int().min(0),
  })
  .strict();
export const geminiSchema = z.object({
  technologies: z.array(z.string().max(80)).max(40),
  domain: z.enum(DOMAINS),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(500),
  keywords: z.array(z.string().max(60)).max(15),
});
