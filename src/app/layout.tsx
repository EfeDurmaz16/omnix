import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthWrapper } from "@/components/auth/ClerkAuthWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Aspendos - Your All-in-One AI Platform",
  description: "Chat with advanced AI models, generate stunning images, and create videos. Access GPT-4, Claude, Gemini, Imagen, Veo, and Seedance in one unified platform.",
  keywords: ["AI", "artificial intelligence", "text generation", "image generation", "video generation", "GPT", "Claude", "Gemini", "Imagen", "Veo", "Seedance"],
  authors: [{ name: "Aspendos Team" }],
  creator: "Aspendos",
  publisher: "Aspendos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aspendos AI",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aspendos.ai",
    title: "Aspendos - Your All-in-One AI Platform",
    description: "Chat with advanced AI models, generate stunning images, and create videos. Access GPT-4, Claude, Gemini, Imagen, Veo, and Seedance in one unified platform.",
    siteName: "Aspendos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aspendos - Your All-in-One AI Platform",
    description: "Chat with advanced AI models, generate stunning images, and create videos. Access GPT-4, Claude, Gemini, Imagen, Veo, and Seedance in one unified platform.",
    creator: "@aspendos",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#8b5cf6",
  robots: "index, follow",
  icons: {
    icon: '/aspendos-icon.svg',
    shortcut: '/aspendos-icon.svg',
    apple: '/aspendos-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Aspendos AI" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
          <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        </head>
        <body className={`${inter.variable} font-mono antialiased cultural-bg`}>
          <ThemeProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
