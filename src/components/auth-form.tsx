"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { clientAuth, firebaseConfigured } from "@/lib/firebase/client";
import { useApp } from "./provider";
import { ErrorBox } from "./ui";
import { ArrowRight, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import type { Profile, Role } from "@/lib/types";
export function AuthForm({ register = false }: { register?: boolean }) {
  const { api, refresh, enterDemo, authUser } = useApp(),
    router = useRouter();
  const [role, setRole] = useState<"student" | "teacher">("student"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      if (!firebaseConfigured)
        throw new Error(
          "Connect Firebase to create real accounts. You can explore the demo below now.",
        );
      const email = String(data.get("email")),
        password = String(data.get("password"));
      if (register) {
        if (!clientAuth().currentUser)
          await createUserWithEmailAndPassword(clientAuth(), email, password);
        await api("auth/register", {
          method: "POST",
          body: {
            name: data.get("name"),
            institution: data.get("institution"),
            role,
          },
        });
      } else await signInWithEmailAndPassword(clientAuth(), email, password);
      const u = (await api("me")) as Profile;
      await refresh();
      router.push(`/dashboard/${u.role}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to sign in.";
      setError(
        msg.includes("auth/invalid-credential")
          ? "Email or password is incorrect."
          : msg.includes("Complete your registration")
            ? "Your authentication account exists. Open Sign up to complete your profile."
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell container">
      <section className="auth-story">
        <div className="eyebrow">BUILD SOMETHING THAT MATTERS</div>
        <h1>
          Your next chapter
          <br />
          starts with
          <br />
          <em>an idea.</em>
        </h1>
        <p>A home for your projects, a community for your curiosity.</p>
        <div className="auth-story-card">
          <Sparkles size={28} />
          <blockquote>
            Knowledge grows when
            <br />
            we build on it together.
          </blockquote>
          <small>THE HACKREPO PHILOSOPHY</small>
        </div>
        <Link href="/projects">
          Explore the repository <ArrowRight size={16} />
        </Link>
      </section>
      <section className="auth-form-panel">
        <div className="eyebrow">
          {register ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
        </div>
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p>
          {register
            ? "Create an account to share or review student innovation."
            : "Log in to your HackRepo workspace."}
        </p>
        <ErrorBox message={error} />
        {message && (
          <div className="info" role="status">
            {message}
          </div>
        )}
        <form onSubmit={submit}>
          {register && (
            <>
              <div className="role-options">
                <button
                  type="button"
                  className={role === "student" ? "chosen" : ""}
                  onClick={() => setRole("student")}
                >
                  <GraduationCap />
                  Student<small>Share your projects</small>
                </button>
                <button
                  type="button"
                  className={role === "teacher" ? "chosen" : ""}
                  onClick={() => setRole("teacher")}
                >
                  <BookOpen />
                  Teacher<small>Review & guide</small>
                </button>
              </div>
              <label>
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </label>
              <label>
                College / institution
                <input
                  name="institution"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="Where you learn or teach"
                />
              </label>
            </>
          )}
          {!(register && authUser) && (
            <>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@college.edu"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                />
              </label>
            </>
          )}
          {!register && (
            <button
              className="text-link forgot"
              type="button"
              onClick={async (e) => {
                const email = (
                  e.currentTarget.form?.elements.namedItem(
                    "email",
                  ) as HTMLInputElement
                )?.value;
                if (!email) {
                  setError("Enter your email address first.");
                  return;
                }
                try {
                  await sendPasswordResetEmail(clientAuth(), email);
                  setMessage(
                    "If an account exists, a password reset email has been sent.",
                  );
                } catch {
                  setError(
                    "Could not request a reset. Check your email and Firebase configuration.",
                  );
                }
              }}
            >
              Forgot password?
            </button>
          )}
          {register && role === "teacher" && (
            <div className="info">
              Teacher accounts require approval from the project owner.
            </div>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Log in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already part of the community?" : "New to HackRepo?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Log in" : "Sign up"}
          </Link>
        </p>
        <div className="divider">OR EXPLORE A DEMO</div>
        <div className="demo-buttons compact">
          {(["student", "teacher", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              className="button secondary small"
              onClick={() => {
                enterDemo(r);
                router.push(`/dashboard/${r}`);
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <small className="muted">
          Demo accounts use sample data, not Firebase accounts.
        </small>
      </section>
    </main>
  );
}
