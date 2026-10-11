import test from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../src/lib/server/api";
import { handled } from "../src/lib/server/http";
import { adminServices } from "../src/lib/firebase/admin";
const enabled =
  !!process.env.FIRESTORE_EMULATOR_HOST &&
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
test(
  "Firebase emulator: complete workflow, authorization, rules and deletion",
  { skip: !enabled },
  async (t) => {
    const { db, auth } = adminServices();
    async function account(name: string) {
      const email = `${name}-${Date.now()}@example.test`;
      const r = await fetch(
        `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: "emulator-only-password",
            returnSecureToken: true,
          }),
        },
      );
      assert(r.ok);
      return (await r.json()) as {
        idToken: string;
        localId: string;
        email: string;
      };
    }
    async function call(
      path: string,
      method = "GET",
      token?: string,
      data?: unknown,
    ) {
      const req = new Request(`http://localhost/api/${path}`, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const r = await handled(() =>
        dispatch(req, new URL(req.url).pathname.split("/").slice(2)),
      );
      return { status: r.status, data: await r.json() };
    }
    const s = await account("student"),
      other = await account("other"),
      teacher = await account("teacher"),
      owner = await account("owner");
    process.env.ADMIN_UID = owner.localId;
    const register = (token: string, role: string) =>
      call("auth/register", "POST", token, {
        name: "Integration tester",
        institution: "Test college",
        role,
      });
    await t.test("registration cannot assign admin privileges", async () => {
      assert.equal((await register(s.idToken, "admin")).status, 400);
    });
    for (const [u, r] of [
      [s, "student"],
      [other, "student"],
      [teacher, "teacher"],
      [owner, "student"],
    ] as const)
      assert.equal((await register(u.idToken, r)).status, 200);
    await db.collection("users").doc(owner.localId).update({ role: "admin" });
    await t.test(
      "admin APIs reject anonymous and student callers",
      async () => {
        assert.equal((await call("admin/users")).status, 401);
        assert.equal((await call("admin/users", "GET", s.idToken)).status, 403);
      },
    );
    await t.test("teacher requires owner approval", async () => {
      assert.equal(
        (await call("projects?queue=1", "GET", teacher.idToken)).status,
        403,
      );
      assert.equal(
        (
          await call(
            `admin/teachers/${teacher.localId}`,
            "PATCH",
            owner.idToken,
            { approved: true },
          )
        ).status,
        200,
      );
    });
    const input = {
      title: "Campus recycling vision",
      abstract:
        "Classify recyclable campus waste and coordinate efficient collection.",
      description:
        "Python, OpenCV, Next.js and Firebase power camera-based sorting.",
      githubUrl: "",
      presentationUrl: "",
      demoUrl: "",
    };
    const created = await call("projects", "POST", s.idToken, {
      ...input,
      status: "draft",
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    await t.test(
      "private draft is denied to public, another student and teachers",
      async () => {
        for (const token of [undefined, other.idToken, teacher.idToken])
          assert.equal(
            (await call(`projects/${id}`, "GET", token)).status,
            403,
          );
      },
    );
    await t.test("clients cannot inject status or AI fields", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "approved",
            revision: 0,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "draft",
            revision: 0,
            analysis: { method: "gemini" },
          })
        ).status,
        400,
      );
    });
    await t.test(
      "dictionary fallback is truthful, cached and content-bound",
      async () => {
        const a = await call("ai/analyze", "POST", s.idToken, {
          ...input,
          excludeProjectId: id,
        });
        assert.equal(a.status, 200);
        assert.equal(a.data.method, "dictionary");
        assert(a.data.technologies.includes("OpenCV"));
        const b = await call("ai/analyze", "POST", s.idToken, {
          ...input,
          excludeProjectId: id,
        });
        assert.equal(b.data.analyzedAt, a.data.analyzedAt);
      },
    );
    await t.test("owner submits and stale edits are rejected", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", other.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "draft",
            revision: 0,
          })
        ).status,
        403,
      );
    });
    await t.test(
      "students cannot review; approved teacher can request changes",
      async () => {
        const body = {
          decision: "changes_requested",
          comments: "Please explain the dataset and evaluation methodology.",
          revision: 1,
        };
        assert.equal(
          (await call(`projects/${id}/review`, "POST", s.idToken, body)).status,
          403,
        );
        assert.equal(
          (await call(`projects/${id}/review`, "POST", teacher.idToken, body))
            .status,
          200,
        );
        assert.equal(
          (await call(`projects/${id}/review`, "POST", teacher.idToken, body))
            .status,
          409,
        );
      },
    );
    await t.test("revision guard protects requested changes", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 2,
          })
        ).status,
        200,
      );
    });
    await t.test(
      "approval publishes project but keeps internal review history private",
      async () => {
        assert.equal(
          (
            await call(`projects/${id}/review`, "POST", teacher.idToken, {
              decision: "approved",
              comments:
                "The methodology is clear and suitable for publication.",
              revision: 3,
            })
          ).status,
          200,
        );
        const p = await call(`projects/${id}`);
        assert.equal(p.status, 200);
        assert.equal(p.data.project.analysis, null);
        assert.deepEqual(p.data.reviews, []);
        assert(
          (await call("projects")).data.items.some(
            (p: { id: string }) => p.id === id,
          ),
        );
      },
    );
    await t.test(
      "direct Firestore reads and writes are denied by rules",
      async () => {
        const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${s.localId}`;
        const headers = {
          Authorization: `Bearer ${s.idToken}`,
          "Content-Type": "application/json",
        };
        assert.equal((await fetch(endpoint, { headers })).status, 403);
        assert.equal(
          (
            await fetch(endpoint, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                fields: { role: { stringValue: "admin" } },
              }),
            })
          ).status,
          403,
        );
      },
    );
    await t.test("owner cannot be deleted and aggregates return", async () => {
      assert.equal(
        (await call(`admin/users/${owner.localId}`, "DELETE", owner.idToken))
          .status,
        403,
      );
      const result = await call("admin/stats", "GET", owner.idToken);
      assert.equal(result.status, 200);
      assert(result.data.projects >= 1);
    });
    await t.test(
      "daily caps reject new analysis but preserve cached results",
      async () => {
        process.env.AI_USER_DAILY_LIMIT = "1";
        assert.equal(
          (
            await call("ai/analyze", "POST", s.idToken, {
              ...input,
              title: "A completely new recycling project",
            })
          ).status,
          429,
        );
        assert.equal(
          (await call("ai/analyze", "POST", s.idToken, input)).status,
          200,
        );
      },
    );
    await t.test(
      "deleted UID marker prevents profile resurrection",
      async () => {
        await db
          .collection("deletedUsers")
          .doc(other.localId)
          .set({ deletedAt: new Date().toISOString() });
        await db.collection("users").doc(other.localId).delete();
        assert.equal((await register(other.idToken, "student")).status, 403);
        assert(!(await db.collection("users").doc(other.localId).get()).exists);
      },
    );
    await t.test(
      "deletion cascades through Auth, profiles, projects and reviews",
      async () => {
        assert.equal(
          (await call(`admin/users/${s.localId}`, "DELETE", owner.idToken))
            .status,
          200,
        );
        assert(!(await db.collection("users").doc(s.localId).get()).exists);
        assert(
          (await db.collection("deletedUsers").doc(s.localId).get()).exists,
        );
        assert(!(await db.collection("projects").doc(id).get()).exists);
        assert(
          (
            await db
              .collection("reviews")
              .where("studentId", "==", s.localId)
              .get()
          ).empty,
        );
        await assert.rejects(auth.getUser(s.localId));
        assert.equal((await call("me", "GET", s.idToken)).status, 401);
      },
    );
  },
);
