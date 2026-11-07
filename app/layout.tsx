import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Eskort Umcimbi Planner",
  description: "Plan the perfect Umcimbi in minutes. Tell us how many people are coming, your budget, and your braai style.",
  keywords: ["Eskort", "Umcimbi", "Braai", "Planner", "South Africa"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-eskort-dark-bg text-white antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}