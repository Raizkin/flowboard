"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export function RouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);
  return isAuthRoute ? <>{children}</> : <AppShell>{children}</AppShell>;
}
