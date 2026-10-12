"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  useEffectEvent,
  useRef,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { clientAuth, firebaseConfigured } from "@/lib/firebase/client";
import {
  initialDemo,
  profileForRole,
  demoAnalyze,
  demoProjects,
  type DemoState,
} from "@/lib/demo";
import type {
  Profile,
  Project,
  Review,
  Role,
  ProjectInput,
  Analysis,
} from "@/lib/types";
import { canReadProject, canEditProject, isTeacher } from "@/lib/policy";
import { searchProjects, projectAnalytics } from "@/lib/discovery";
type API = (
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<unknown>;
interface Context {
  profile: Profile | null;
  authUser: User | null;
  loading: boolean;
  demo: boolean;
  notice: string;
  api: API;
  enterDemo: (role: Role) => void;
  leaveDemo: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  toast: (s: string) => void;
}
const C = createContext<Context | null>(null);
const DEMO_KEY = "hackrepo-demo-v1";
export function Provider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [authUser, setAuthUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false),
    [demoState, setDemoState] = useState<DemoState>(initialDemo),
    [notice, setNotice] = useState("");
  const demoRef = useRef(demoState);
  const toast = useCallback((s: string) => setNotice(s), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  const liveAPI: API = useCallback(async (path, options = {}) => {
    const u = firebaseConfigured ? clientAuth().currentUser : null;
    const token = await u?.getIdToken();
    const response = await fetch(`/api/${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed.");
    return result;
  }, []);
  const refresh = useCallback(async () => {
    if (demo) return;
    setProfile((await liveAPI("me")) as Profile);
  }, [demo, liveAPI]);
  const initializeSession = useEffectEvent(() => {
    const role = sessionStorage.getItem("hackrepo-demo-role") as Role | null;
    if (role && ["student", "teacher", "admin"].includes(role)) {
      try {
        const stored = localStorage.getItem(DEMO_KEY);
        if (stored) {
          demoRef.current = JSON.parse(stored);
          setDemoState(demoRef.current);
        }
      } catch {
        localStorage.removeItem(DEMO_KEY);
      }
      setDemo(true);
      setProfile(profileForRole(role));
      setLoading(false);
      return;
    }
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(clientAuth(), async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          setProfile((await liveAPI("me")) as Profile);
        } catch {
          setProfile(null);
        }
      } else setProfile(null);
      setLoading(false);
    });
  });
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) cleanup = initializeSession();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [demo]);
  const commit = (state: DemoState) => {
    demoRef.current = state;
    setDemoState(state);
    localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  };
  const api: API = async (path, options = {}) => {
    if ((demo || !firebaseConfigured) && ["projects/search", "analytics"].includes(path.split("?")[0])) {
      const projects = (demo ? demoRef.current.projects : demoProjects).filter(p => p.status === "approved");
      if (path.split("?")[0] === "analytics") return { ...projectAnalytics(projects), truncated: false };
      const items = searchProjects(projects, new URLSearchParams(path.split("?")[1]));
      return { items, matched: items.length, scanned: projects.length, truncated: false };
    }
    if (!demo) {
      if (!firebaseConfigured && (options.method ?? "GET") === "GET") {
        if (
          path.split("?")[0] === "projects" &&
          !path.includes("mine=") &&
          !path.includes("queue=")
        )
          return {
            items: demoProjects.filter((p) => p.status === "approved"),
            nextCursor: null,
          };
        const sample = demoProjects.find(
          (p) => path === `projects/${p.id}` && p.status === "approved",
        );
        if (sample) return { project: sample, reviews: [] };
      }
      return liveAPI(path, options);
    }
    const [route, qs] = path.split("?");
    const parts = route.split("/");
    const query = new URLSearchParams(qs);
    const method = options.method ?? "GET";
    const u = profile;
    const input = options.body as Record<string, unknown> | undefined;
    const requireRole = (r: Role) => {
      if (!u || u.role !== r || (r === "teacher" && !isTeacher(u)))
        throw new Error("This demo role cannot perform that action.");
    };
    if (route === "me") return u;
    if (route === "projects" && method === "GET")
      return {
        items: demoRef.current.projects.filter((p) =>
          query.has("mine")
            ? p.studentId === u?.uid
            : query.has("queue")
              ? p.status === "pending"
              : p.status === "approved",
        ),
        nextCursor: null,
      };
    if (route === "ai/import-repository") {
      requireRole("student");
      throw new Error("Live GitHub import requires a real student account and configured Firebase. Demo mode supports manual sample submissions only.");
    }
    if (route === "ai/analyze") {
      requireRole("student");
      return demoAnalyze(
        input as unknown as ProjectInput,
        demoRef.current.projects,
        input?.excludeProjectId as string,
      );
    }
    if (route === "projects" && method === "POST") {
      requireRole("student");
      const p = input as unknown as ProjectInput & {
        status: Project["status"];
      };
      const a = demoAnalyze(p, demoRef.current.projects);
      const time = new Date().toISOString();
      const project: Project = {
        ...p,
        id: crypto.randomUUID(),
        studentId: u!.uid,
        studentName: u!.name,
        institution: u!.institution,
        techStack: a.technologies,
        techCategories: a.technologyCategories,
        sihDomain: a.domain,
        analysis: a,
        createdAt: time,
        updatedAt: time,
        submittedAt: p.status === "pending" ? time : null,
        revision: 0,
      };
      commit({
        ...demoRef.current,
        projects: [project, ...demoRef.current.projects],
      });
      return project;
    }
    if (parts[0] === "projects" && parts[1]) {
      const p = demoRef.current.projects.find((p) => p.id === parts[1]);
      if (!p) throw new Error("Project not found.");
      if (!canReadProject(p, u, "demo-admin"))
        throw new Error("This project is private.");
      if (parts[2] === "review") {
        requireRole("teacher");
        if (p.status !== "pending" || p.revision !== input?.revision)
          throw new Error("Project changed. Reload.");
        const r: Review = {
          id: crypto.randomUUID(),
          projectId: p.id,
          studentId: p.studentId,
          teacherId: u!.uid,
          teacherName: u!.name,
          decision: input?.decision as Review["decision"],
          comments: input?.comments as string,
          createdAt: new Date().toISOString(),
        };
        commit({
          ...demoRef.current,
          projects: demoRef.current.projects.map((x) =>
            x.id === p.id
              ? { ...x, status: r.decision, revision: x.revision + 1 }
              : x,
          ),
          reviews: [r, ...demoRef.current.reviews],
        });
        return { ok: true };
      }
      if (method === "PATCH") {
        requireRole("student");
        if (!canEditProject(p, u!) || p.revision !== input?.revision)
          throw new Error("This project cannot be edited.");
        const a: Analysis = demoAnalyze(
          input as unknown as ProjectInput,
          demoRef.current.projects,
          p.id,
        );
        commit({
          ...demoRef.current,
          projects: demoRef.current.projects.map((x) =>
            x.id === p.id
              ? ({
                  ...x,
                  ...input,
                  analysis: a,
                  techStack: a.technologies,
                  techCategories: a.technologyCategories,
                  sihDomain: a.domain,
                  updatedAt: new Date().toISOString(),
                  revision: x.revision + 1,
                } as Project)
              : x,
          ),
        });
        return { id: p.id };
      }
      if (method === "DELETE") {
        if (p.studentId !== u?.uid || p.status !== "draft")
          throw new Error("Only your drafts can be deleted.");
        commit({
          ...demoRef.current,
          projects: demoRef.current.projects.filter((x) => x.id !== p.id),
        });
        return { ok: true };
      }
      return {
        project: p,
        reviews: demoRef.current.reviews.filter((r) => r.projectId === p.id),
      };
    }
    if (route === "reviews") {
      requireRole("teacher");
      return demoRef.current.reviews.filter((r) => r.teacherId === u?.uid);
    }
    if (parts[0] === "admin") {
      requireRole("admin");
      if (parts[1] === "stats")
        return {
          students: demoRef.current.users.filter((u) => u.role === "student")
            .length,
          teachers: demoRef.current.users.filter(
            (u) => u.role === "teacher" && u.approved,
          ).length,
          pendingTeachers: demoRef.current.users.filter(
            (u) => u.role === "teacher" && !u.approved && !u.rejected,
          ).length,
          projects: demoRef.current.projects.length,
          reviews: demoRef.current.reviews.length,
          statuses: demoRef.current.projects.reduce(
            (a, p) => ({ ...a, [p.status]: (a[p.status] ?? 0) + 1 }),
            {} as Record<string, number>,
          ),
        };
      if (parts[1] === "users" && !parts[2])
        return {
          items: demoRef.current.users.map((u) => ({
            ...u,
            projectCount: demoRef.current.projects.filter(
              (p) => p.studentId === u.uid,
            ).length,
            reviewCount: demoRef.current.reviews.filter(
              (r) => r.teacherId === u.uid,
            ).length,
          })),
          nextCursor: null,
        };
      if (parts[1] === "teachers") {
        commit({
          ...demoRef.current,
          users: demoRef.current.users.map((x) =>
            x.uid === parts[2]
              ? {
                  ...x,
                  approved: !!input?.approved,
                  rejected: !input?.approved,
                }
              : x,
          ),
        });
        return { ok: true };
      }
      if (parts[1] === "users" && method === "DELETE") {
        if (parts[2] === "demo-admin")
          throw new Error("Owner cannot be deleted.");
        commit({
          users: demoRef.current.users.filter((x) => x.uid !== parts[2]),
          projects: demoRef.current.projects.filter(
            (x) => x.studentId !== parts[2],
          ),
          reviews: demoRef.current.reviews.filter(
            (x) => x.studentId !== parts[2] && x.teacherId !== parts[2],
          ),
        });
        return { ok: true };
      }
      return {
        user: demoRef.current.users.find((x) => x.uid === parts[2]),
        projects: demoRef.current.projects.filter(
          (x) => x.studentId === parts[2],
        ),
        reviews: demoRef.current.reviews.filter(
          (x) => x.teacherId === parts[2],
        ),
      };
    }
    throw new Error("Unknown demo action.");
  };
  const enterDemo = (role: Role) => {
    sessionStorage.setItem("hackrepo-demo-role", role);
    setDemo(true);
    setProfile(profileForRole(role));
    try {
      const s = localStorage.getItem(DEMO_KEY);
      if (s) {
        demoRef.current = JSON.parse(s);
        setDemoState(demoRef.current);
      }
    } catch {
      commit(initialDemo());
    }
  };
  const leaveDemo = () => {
    sessionStorage.removeItem("hackrepo-demo-role");
    window.location.reload();
  };
  const logout = async () => {
    if (demo) {
      leaveDemo();
      return;
    }
    await signOut(clientAuth());
    setProfile(null);
  };
  return (
    <C.Provider
      value={{
        profile,
        authUser,
        loading,
        demo,
        notice,
        api,
        enterDemo,
        leaveDemo,
        logout,
        refresh,
        toast,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
    </C.Provider>
  );
}
export function useApp() {
  const v = useContext(C);
  if (!v) throw new Error("Provider missing");
  return v;
}
