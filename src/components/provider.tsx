"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  useEffectEvent,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { clientAuth, firebaseConfigured } from "@/lib/firebase/client";
import type { Profile } from "@/lib/types";
import { APIError } from "@/lib/auth-flow";
type API = (
  path: string,
  options?: { method?: string; body?: unknown },
) => Promise<unknown>;
interface Context {
  profile: Profile | null;
  authUser: User | null;
  loading: boolean;
  notice: string;
  api: API;
  download: (path: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  toast: (s: string) => void;
}
const C = createContext<Context | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null),
    [authUser, setAuthUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const toast = useCallback((s: string) => setNotice(s), []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  const liveAPI: API = useCallback(async (path, options = {}) => {
    const u = firebaseConfigured ? clientAuth().currentUser : null;
    if (firebaseConfigured) await clientAuth().authStateReady();
    const token = await (firebaseConfigured ? clientAuth().currentUser : u)?.getIdToken();
    const response = await fetch(`/api/${path}`, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: {
        ...(options.body instanceof FormData ? {} : {"Content-Type": "application/json"}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : options.body instanceof FormData ? options.body : JSON.stringify(options.body),
    });
    const result = await response.json();
    if (!response.ok) throw new APIError(response.status, result.error ?? "Request failed.");
    return result;
  }, []);
  const download = async (path:string,name:string) => {
    if(firebaseConfigured)await clientAuth().authStateReady();
    const token=firebaseConfigured?await clientAuth().currentUser?.getIdToken():undefined;
    const response=await fetch(`/api/${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:"no-store"});
    if(!response.ok){const data=await response.json();throw new Error(data.error??"Download failed.");}
    const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  const refresh = useCallback(async () => {
    setProfile((await liveAPI("me")) as Profile);
  }, [liveAPI]);
  const initializeSession = useEffectEvent(() => {
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
  }, []);
  const api = liveAPI;
  useEffect(() => {
    const onFocus = () => {
      if (firebaseConfigured && clientAuth().currentUser) void refresh().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  const logout = async () => {
    await signOut(clientAuth());
    setProfile(null);
  };
  return (
    <C.Provider
      value={{
        profile,
        authUser,
        loading,
        notice,
        api,
        download,
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
