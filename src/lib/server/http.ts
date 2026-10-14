import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminServices } from "../firebase/admin";
import { isAdmin, isTeacher } from "../policy";
import type { Profile, Role } from "../types";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: {code:string;existingProject?:{id:string;title:string;status:string}},
  ) {
    super(message);
  }
}
export async function identity(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer "))
    throw new HttpError(401, "Please sign in to continue.");
  const { auth } = adminServices();
  try {
    return await auth.verifyIdToken(header.slice(7), true);
  } catch {
    throw new HttpError(401, "Session expired. Please sign in again.");
  }
}
export async function authorize(req: Request, role?: Role) {
  const token = await identity(req);
  const snap = await adminServices()
    .db.collection("users")
    .doc(token.uid)
    .get();
  if (!snap.exists)
    throw new HttpError(403, "Complete your registration first.");
  const u = snap.data() as Profile;
  if (u.deleting) throw new HttpError(403, "This account is being removed.");
  if (
    role &&
    ((role === "admin" && !isAdmin(u, process.env.ADMIN_UID)) ||
      (role === "teacher" && !isTeacher(u)) ||
      (role === "student" && u.role !== "student"))
  )
    throw new HttpError(403, "You do not have permission for this action.");
  return u;
}
export async function optionalUser(req: Request) {
  return req.headers.has("authorization") ? authorize(req) : null;
}
export async function body(req: Request) {
  const text = await req.text();
  if (text.length > 24000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function handled(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...e.details }, e.status);
    if (e instanceof ZodError)
      return json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    console.error(
      "Request failed",
      e instanceof Error ? e.name : "Unknown error",
    );
    return json(
      {
        error:
          "The service could not complete this request. Check server configuration and try again.",
      },
      503,
    );
  }
}
export async function assertActive(
  tx: FirebaseFirestore.Transaction,
  uid: string,
) {
  const s = await tx.get(adminServices().db.collection("users").doc(uid));
  if (!s.exists || s.data()?.deleting)
    throw new HttpError(403, "Account unavailable.");
  return s.data() as Profile;
}
