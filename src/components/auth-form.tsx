"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { clientAuth, firebaseConfigured } from "@/lib/firebase/client";
import { useApp } from "./provider";
import { ErrorBox } from "./ui";
import { ArrowRight, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import { authErrorMessage, signInDestination } from "@/lib/auth-flow";
export function AuthForm({ register = false }: { register?: boolean }) {
  const { api, refresh, authUser, logout } = useApp(),
    router = useRouter();
  const [role, setRole] = useState<"student" | "teacher">("student"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [needsProfile, setNeedsProfile] = useState(false);
  const registering = register || needsProfile;
  async function finishSignIn() {
    const destination = await signInDestination(() => api("me"));
    if (!destination) {
      setNeedsProfile(true);
      setMessage("You’re signed in. Complete your profile below to enter your workspace.");
      return;
    }
    await refresh();
    router.replace(destination.path);
  }
  async function googleSignIn() {
    setBusy(true); setError(""); setMessage("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(clientAuth(), provider);
      await finishSignIn();
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(e.currentTarget);
    try {
      if (!firebaseConfigured)
        throw new Error(
          "Firebase authentication is not configured. Contact the project owner.",
        );
      const email = String(data.get("email")),
        password = String(data.get("password"));
      if (registering) {
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
      await finishSignIn();
    } catch (e) {
      setError(authErrorMessage(e));
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
          {registering ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
        </div>
        <h2>{needsProfile ? "Complete your profile" : register ? "Create your account" : "Welcome back"}</h2>
        <p>
          {registering
            ? "Create an account to share or review student innovation."
            : "Log in to your HackRepo workspace."}
        </p>
        <ErrorBox message={error} />
        {message && (
          <div className="info" role="status">
            {message}
          </div>
        )}
        {!(registering && authUser) && <>
          <button className="button google-signin full" type="button" disabled={busy} onClick={() => void googleSignIn()}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.01v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.34Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.51H3.06a10 10 0 0 0 0 8.98l3.34-2.58Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.51l2.88-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.34 2.58A6 6 0 0 1 12 5.97Z"/></svg>
            {busy ? "Please wait…" : "Continue with Google"}
          </button>
          <div className="auth-divider"><span>or continue with email</span></div>
        </>}
        {registering && authUser && <div className="signed-in-account"><span>Signed in as <strong>{authUser.email}</strong></span><button type="button" className="text-link" disabled={busy} onClick={async () => { try { await logout(); setNeedsProfile(false); setMessage(""); } catch (e) { setError(authErrorMessage(e)); } }}>Use another account</button></div>}
        <form onSubmit={submit} aria-busy={busy}>
          {registering && (
            <>
              <div className="role-options">
                <button
                  type="button"
                  className={role === "student" ? "chosen" : ""}
                  aria-pressed={role === "student"}
                  disabled={busy}
                  onClick={() => setRole("student")}
                >
                  <GraduationCap />
                  Student<small>Share your projects</small>
                </button>
                <button
                  type="button"
                  className={role === "teacher" ? "chosen" : ""}
                  aria-pressed={role === "teacher"}
                  disabled={busy}
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
                  key={authUser?.uid ?? "new"}
                  defaultValue={authUser?.displayName ?? ""}
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
          {!(registering && authUser) && (
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
                  autoComplete={registering ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                />
              </label>
            </>
          )}
          {!registering && (
            <button
              className="text-link forgot"
              type="button"
              disabled={busy}
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
          {registering && role === "teacher" && (
            <div className="info">
              Teacher accounts require approval from the project owner.
            </div>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "Please wait…" : registering ? authUser ? "Complete profile" : "Create account" : "Log in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already part of the community?" : "New to HackRepo?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Log in" : "Sign up"}
          </Link>
        </p>
      </section>
    </main>
  );
}
