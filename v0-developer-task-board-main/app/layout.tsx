import React from "react"
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const _jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "BugBoard - Developer Task Tracker",
  description:
    "A clean, modern bug board and task tracker for developers. Track bugs, features, and improvements with a Kanban-style interface.",
};

export const viewport: Viewport = {
  themeColor: "#1a1f2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
