import type { Metadata } from "next";
import { RouteFrame } from "@/components/route-frame";
import { BoardProvider } from "@/lib/board-store";
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
        <BoardProvider>
          <RouteFrame>{children}</RouteFrame>
        </BoardProvider>
      </body>
    </html>
  );
}
