import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReferenceAudit - Audit your references with confidence",
  description: "Upload any document and instantly verify whether every reference exists, matches the claim, and preserves the original meaning. Built for students, researchers, journals, and professionals.",
  openGraph: {
    title: "ReferenceAudit - Audit your references with confidence",
    description: "Upload any document and instantly verify whether every reference exists, matches the claim, and preserves the original meaning.",
    url: "https://refint-clean.vercel.app",
    siteName: "ReferenceAudit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReferenceAudit - Audit your references with confidence",
    description: "Upload any document and instantly verify whether every reference exists, matches the claim, and preserves the original meaning.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
