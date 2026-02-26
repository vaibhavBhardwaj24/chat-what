import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat-What",
  description: "A modern, full-featured real-time chat application",
  openGraph: {
    title: "Chat-What",
    description: "A modern, full-featured real-time chat application built with Next.js, Convex, and Clerk.",
    siteName: "Chat-What",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png", // Provide a default or placeholder OG image route if necessary
        width: 1200,
        height: 630,
        alt: "Chat-What Preview",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col`}
      >
        <ThemeProvider>
          <ConvexClientProvider>
            <Header />
            <main className="flex-1 overflow-hidden flex flex-col">
              {children}
            </main>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
