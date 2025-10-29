import type { Metadata } from "next";
import "./globals.css";
import AuthProviderClient from "@/components/auth/AuthProviderClient";
import Header from "@/components/layout/Header";
import ThemeInitializer from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Tools Collection",
  description: "A collection of useful tools for everyday tasks",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased vsc-initialized text-gray-900 dark:text-white">
        <AuthProviderClient>
          <ThemeInitializer />
          <Header />
          <main className="site-container">{children}</main>
        </AuthProviderClient>
      </body>
    </html>
  );
}