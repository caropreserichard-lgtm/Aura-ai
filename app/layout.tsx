import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import NextAuthProvider from "@/components/NextAuthProvider";
import PWARegister from "@/components/PWARegister";
import GlobalChatbox from "@/components/GlobalChatbox";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
};

export const metadata: Metadata = {
  title: "Tayrona AI",
  description: "Tu Sistema Operativo Personal de Productividad",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tayrona AI",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg-primary text-text-primary font-sans">
        <NextAuthProvider>
          <ThemeProvider>
            <PWARegister />
            {children}
            <GlobalChatbox />
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
