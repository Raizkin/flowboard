import type { Metadata } from "next";
import { RouteFrame } from "@/components/route-frame";
import { BoardProvider } from "@/lib/board-store";
import { LanguageProvider } from "@/lib/language";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowboard — Projects, in motion",
  description: "A calm, collaborative workspace for projects and tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <BoardProvider>
            <RouteFrame>{children}</RouteFrame>
          </BoardProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
