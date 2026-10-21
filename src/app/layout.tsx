import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "D&D Companion — Книга приключений",
  description:
    "Локальный русскоязычный компаньон для игроков и мастеров. Правила 2014 и 2024.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
