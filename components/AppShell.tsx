"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth-context";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicGroupRoute = pathname?.startsWith("/group/") ?? false;

  if (isPublicGroupRoute) {
    return <main>{children}</main>;
  }

  return (
    <AuthProvider>
      <Navbar />
      <main>{children}</main>
    </AuthProvider>
  );
}
