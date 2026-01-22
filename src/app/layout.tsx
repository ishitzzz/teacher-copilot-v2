import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// We load the font and force it to be 'latin'
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrayogshalaXR",
  description: "AI Co-pilot for Teachers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* DIRECTLY APPLY THE CLASS. No variables. */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}