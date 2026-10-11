import { FieldPath } from "firebase-admin/firestore";
import { adminServices } from "../firebase/admin";
import {
  authorize,
  optionalUser,
  identity,
  body,
  json,
  HttpError,
  assertActive,
} from "./http";
import {
  registrationSchema,
  saveSchema,
  analysisSchema,
  reviewSchema,
} from "../validation";
import { isAdmin, isTeacher, canReadProject, canEditProject } from "../policy";
import { normalizeTechnologies, classifyByRules } from "../taxonomy";
import { analyze, cacheKey } from "./analysis";
import { z } from "zod";
import type { Profile, Project, Analysis } from "../types";
const now = () => new Date().toISOString();
const idOK = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    throw new HttpError(400, "Invalid identifier.");
  return id;
};
const projectFrom = (d: FirebaseFirestore.DocumentSnapshot) =>
  ({ ...d.data(), id: d.id }) as Project;
async function count(q: FirebaseFirestore.Query) {
  return (await q.count().get()).data().count;
}
function publicProject(p: Project) {
  return { ...p, analysis: null };
}
async function purge(q: FirebaseFirestore.Query) {
  for (;;) {
    const s = await q.limit(200).get();
    if (s.empty) break;
    const b = adminServices().db.batch();
    s.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}
export async function dispatch(req: Request, parts: string[]) {
  const path = parts.join("/"),
    method = req.method,
    url = new URL(req.url);
  const { db, auth } = adminServices();
  if (path === "auth/register" && method === "POST") {
    const token = await identity(req);
    const input = registrationSchema.parse(await body(req));
    const ref = db.collection("users").doc(token.uid);
    const user = await db.runTransaction(async (tx) => {
      const [s, tombstone] = await Promise.all([
        tx.get(ref),
        tx.get(db.collection("deletedUsers").doc(token.uid)),
      ]);
      if (tombstone.exists || s.data()?.deleting)
        throw new HttpError(
          403,
          "This account is being removed or was deleted.",
        );
      if (s.exists) return s.data();
      const t = now();
      const u: Profile = {
        ...input,
        uid: token.uid,
        email: token.email ?? "",
        approved: input.role === "student",
        rejected: false,
        createdAt: t,
        updatedAt: t,
      };
      tx.create(ref, u);
      return u;
    });
    return json(user);
  }
  if (path === "me" && method === "GET") return json(await authorize(req));
  if (path === "ai/analyze" && method === "POST") {
    const u = await authorize(req, "student");
    const p = analysisSchema.parse(await body(req));
    if (p.excludeProjectId) {
      const s = await db
        .collection("projects")
        .doc(idOK(p.excludeProjectId))
        .get();
      if (!s.exists || s.data()?.studentId !== u.uid)
        throw new HttpError(403, "Project does not belong to you.");
    }
    return json(await analyze(u.uid, p, p.excludeProjectId));
  }
  if (path === "projects" && method === "GET") {
    const mine = url.searchParams.get("mine") === "1",
      queue = url.searchParams.get("queue") === "1";
    let q: FirebaseFirestore.Query = db.collection("projects");
    if (mine) {
      const u = await authorize(req, "student");
      q = q.where("studentId", "==", u.uid);
    } else if (queue) {
      await authorize(req, "teacher");
      q = q.where("status", "==", "pending");
    } else q = q.where("status", "==", "approved");
    q = q.orderBy(FieldPath.documentId());
    const cursor = url.searchParams.get("cursor");
    if (cursor) q = q.startAfter(idOK(cursor));
    const docs = await q.limit(101).get();
    const selected = docs.docs.slice(0, 100);
    return json({
      items: selected.map((d) =>
        mine || queue ? projectFrom(d) : publicProject(projectFrom(d)),
      ),
      nextCursor: docs.size > 100 ? selected.at(-1)?.id : null,
    });
  }
  if (path === "projects" && method === "POST") {
    const u = await authorize(req, "student");
    const {
      status,
      revision: _revision,
      ...p
    } = saveSchema.parse(await body(req));
    void _revision;
    const ref = db.collection("projects").doc();
    const cached = await db
      .collection("analysisCache")
      .doc(cacheKey(u.uid, p))
      .get();
    const analysis = (cached.data()?.result ?? null) as Analysis | null;
    const n = normalizeTechnologies(
        `${p.title} ${p.abstract} ${p.description}`,
      ),
      d = classifyByRules(`${p.title} ${p.abstract} ${p.description}`);
    const time = now();
    const data: Project = {
      ...p,
      id: ref.id,
      studentId: u.uid,
      studentName: u.name,
      institution: u.institution,
      status,
      techStack: analysis?.technologies ?? n.technologies,
      techCategories: analysis?.technologyCategories ?? n.technologyCategories,
      sihDomain: analysis?.domain ?? d.domain,
      analysis,
      createdAt: time,
      updatedAt: time,
      submittedAt: status === "pending" ? time : null,
      revision: 0,
    };
    await db.runTransaction(async (tx) => {
      await assertActive(tx, u.uid);
      tx.create(ref, data);
    });
    return json(data, 201);
  }
  if (parts[0] === "projects" && parts.length === 2) {
    const id = idOK(parts[1]),
      ref = db.collection("projects").doc(id);
    if (method === "GET") {
      const u = await optionalUser(req);
      const s = await ref.get();
      if (!s.exists) throw new HttpError(404, "Project not found.");
      const p = projectFrom(s);
      if (!canReadProject(p, u, process.env.ADMIN_UID))
        throw new HttpError(403, "This project is not public.");
      const internal =
        !!u &&
        (u.uid === p.studentId ||
          isTeacher(u) ||
          isAdmin(u, process.env.ADMIN_UID));
      const reviews = internal
        ? (
            await db
              .collection("reviews")
              .where("projectId", "==", id)
              .limit(100)
              .get()
          ).docs.map((d) => ({ id: d.id, ...d.data() }))
        : [];
      return json({ project: internal ? p : publicProject(p), reviews });
    }
    if (method === "PATCH") {
      const u = await authorize(req, "student");
      const { status, revision, ...p } = saveSchema.parse(await body(req));
      if (revision === undefined)
        throw new HttpError(400, "Revision is required.");
      const cached = await db
        .collection("analysisCache")
        .doc(cacheKey(u.uid, p))
        .get();
      const a = (cached.data()?.result ?? null) as Analysis | null;
      const n = normalizeTechnologies(
          `${p.title} ${p.abstract} ${p.description}`,
        ),
        d = classifyByRules(`${p.title} ${p.abstract} ${p.description}`);
      await db.runTransaction(async (tx) => {
        await assertActive(tx, u.uid);
        const s = await tx.get(ref);
        if (!s.exists) throw new HttpError(404, "Project not found.");
        const old = projectFrom(s);
        if (!canEditProject(old, u))
          throw new HttpError(
            403,
            "This project cannot be edited in its current state.",
          );
        if (old.revision !== revision)
          throw new HttpError(409, "Project changed. Reload before editing.");
        tx.update(ref, {
          ...p,
          status,
          analysis: a,
          techStack: a?.technologies ?? n.technologies,
          techCategories: a?.technologyCategories ?? n.technologyCategories,
          sihDomain: a?.domain ?? d.domain,
          updatedAt: now(),
          submittedAt: status === "pending" ? now() : old.submittedAt,
          revision: revision + 1,
        });
      });
      return json({ id });
    }
    if (method === "DELETE") {
      const u = await authorize(req, "student");
      await db.runTransaction(async (tx) => {
        await assertActive(tx, u.uid);
        const s = await tx.get(ref);
        if (!s.exists) throw new HttpError(404, "Project not found.");
        if (s.data()?.studentId !== u.uid || s.data()?.status !== "draft")
          throw new HttpError(403, "Only your own drafts can be deleted.");
        tx.delete(ref);
      });
      return json({ ok: true });
    }
  }
  if (
    parts[0] === "projects" &&
    parts[2] === "review" &&
    parts.length === 3 &&
    method === "POST"
  ) {
    const u = await authorize(req, "teacher");
    const r = reviewSchema.parse(await body(req)),
      ref = db.collection("projects").doc(idOK(parts[1])),
      review = db.collection("reviews").doc();
    await db.runTransaction(async (tx) => {
      const active = await assertActive(tx, u.uid);
      if (!isTeacher(active))
        throw new HttpError(403, "Teacher approval required.");
      const s = await tx.get(ref);
      if (!s.exists) throw new HttpError(404, "Project not found.");
      const p = projectFrom(s);
      await assertActive(tx, p.studentId);
      if (p.studentId === u.uid)
        throw new HttpError(403, "You cannot review your own project.");
      if (p.status !== "pending" || p.revision !== r.revision)
        throw new HttpError(
          409,
          "This project has already changed. Reload before reviewing.",
        );
      tx.create(review, {
        projectId: p.id,
        studentId: p.studentId,
        teacherId: u.uid,
        teacherName: u.name,
        decision: r.decision,
        comments: r.comments,
        createdAt: now(),
      });
      tx.update(ref, {
        status: r.decision,
        revision: p.revision + 1,
        updatedAt: now(),
      });
    });
    return json({ ok: true });
  }
  if (path === "reviews" && method === "GET") {
    const u = await authorize(req, "teacher");
    const s = await db
      .collection("reviews")
      .where("teacherId", "==", u.uid)
      .limit(200)
      .get();
    return json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  if (parts[0] === "admin") {
    const u = await authorize(req, "admin");
    void u;
    if (path === "admin/stats" && method === "GET") {
      const users = db.collection("users"),
        projects = db.collection("projects");
      const [
        students,
        teachers,
        pendingTeachers,
        projectCount,
        reviews,
        ...statuses
      ] = await Promise.all([
        count(users.where("role", "==", "student")),
        count(
          users.where("role", "==", "teacher").where("approved", "==", true),
        ),
        count(
          users.where("role", "==", "teacher").where("approved", "==", false),
        ),
        count(projects),
        count(db.collection("reviews")),
        ...[
          "draft",
          "pending",
          "changes_requested",
          "approved",
          "rejected",
        ].map((s) => count(projects.where("status", "==", s))),
      ]);
      const rejectedTeachers = await count(
        users
          .where("role", "==", "teacher")
          .where("approved", "==", false)
          .where("rejected", "==", true),
      );
      return json({
        students,
        teachers,
        pendingTeachers: pendingTeachers - rejectedTeachers,
        projects: projectCount,
        reviews,
        statuses: Object.fromEntries(
          ["draft", "pending", "changes_requested", "approved", "rejected"].map(
            (s, i) => [s, statuses[i]],
          ),
        ),
      });
    }
    if (path === "admin/users" && method === "GET") {
      let q: FirebaseFirestore.Query = db
        .collection("users")
        .orderBy(FieldPath.documentId());
      const cursor = url.searchParams.get("cursor");
      if (cursor) q = q.startAfter(idOK(cursor));
      const s = await q.limit(101).get();
      const selected = s.docs.slice(0, 100);
      const items = await Promise.all(
        selected.map(async (d) => {
          const u = d.data() as Profile;
          return {
            ...u,
            projectCount:
              u.role === "student"
                ? await count(
                    db.collection("projects").where("studentId", "==", d.id),
                  )
                : 0,
            reviewCount:
              u.role === "teacher"
                ? await count(
                    db.collection("reviews").where("teacherId", "==", d.id),
                  )
                : 0,
          };
        }),
      );
      return json({
        items,
        nextCursor: s.size > 100 ? selected.at(-1)?.id : null,
      });
    }
    if (parts[1] === "teachers" && parts.length === 3 && method === "PATCH") {
      const input = z
        .object({ approved: z.boolean() })
        .strict()
        .parse(await body(req));
      const ref = db.collection("users").doc(idOK(parts[2]));
      await db.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        if (!s.exists || s.data()?.role !== "teacher" || s.data()?.deleting)
          throw new HttpError(400, "Eligible teacher not found.");
        tx.update(ref, {
          approved: input.approved,
          rejected: !input.approved,
          updatedAt: now(),
        });
      });
      return json({ ok: true });
    }
    if (parts[1] === "users" && parts.length === 3) {
      const uid = idOK(parts[2]),
        ref = db.collection("users").doc(uid);
      if (method === "GET") {
        const s = await ref.get();
        if (!s.exists) throw new HttpError(404, "User not found.");
        const [p, r] = await Promise.all([
          db
            .collection("projects")
            .where("studentId", "==", uid)
            .limit(200)
            .get(),
          db
            .collection("reviews")
            .where("teacherId", "==", uid)
            .limit(200)
            .get(),
        ]);
        return json({
          user: s.data(),
          projects: p.docs.map(projectFrom),
          reviews: r.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      }
      if (method === "DELETE") {
        if (uid === process.env.ADMIN_UID)
          throw new HttpError(403, "The owner account cannot be deleted.");
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists) throw new HttpError(404, "User not found.");
          if (s.data()?.role === "admin")
            throw new HttpError(403, "Admin accounts cannot be deleted.");
          // A permanent UID-only marker prevents an already-verified,
          // in-flight registration from recreating this profile after deletion.
          tx.set(db.collection("deletedUsers").doc(uid), { deletedAt: now() });
          tx.update(ref, { deleting: true, updatedAt: now() });
        });
        try {
          await auth.updateUser(uid, { disabled: true });
          await auth.revokeRefreshTokens(uid);
        } catch (e) {
          if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
        }
        await purge(db.collection("projects").where("studentId", "==", uid));
        await purge(db.collection("reviews").where("studentId", "==", uid));
        await purge(db.collection("reviews").where("teacherId", "==", uid));
        await purge(db.collection("analysisCache").where("uid", "==", uid));
        await purge(db.collection("aiUsage").where("uid", "==", uid));
        try {
          await auth.deleteUser(uid);
        } catch (e) {
          if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
        }
        await ref.delete();
        return json({ ok: true });
      }
    }
  }
  throw new HttpError(404, "Endpoint not found.");
}
