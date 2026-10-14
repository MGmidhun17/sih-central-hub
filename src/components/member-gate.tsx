"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./provider";
export function MemberGate({children}:{children:ReactNode}) {
  const {profile,authUser,loading}=useApp(),path=usePathname(),router=useRouter();
  const protectedPage=/^\/(projects|dashboard|analytics|domains)(\/|$)/.test(path);
  useEffect(()=>{if(protectedPage&&!loading&&!profile)router.replace(authUser?"/register":"/login");},[protectedPage,loading,profile,authUser,router]);
  if(protectedPage&&(loading||!profile))return <main className="container section" role="status">{loading?"Checking your session…":"Please sign in to view projects."}</main>;
  return children;
}
