import type { Metadata } from "next";
import "./site.css";

export const metadata: Metadata = {
  title: "Casablancas — Artist Mode",
  description: "A tactile mobile performance companion for festival fans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
