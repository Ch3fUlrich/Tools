import type { Metadata } from "next";
import "./globals.css";
import AuthProviderClient from "@/components/auth/AuthProviderClient";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeInitializer from "@/components/ThemeInitializer";
import BackendBanner from "@/components/ui/BackendBanner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

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
      <body className="antialiased vsc-initialized text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900">
        <AuthProviderClient>
          <ThemeInitializer />
          {/* Skip-to-content link for keyboard / screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-slate-800 focus:text-slate-900 focus:dark:text-white focus:rounded-lg focus:shadow-lg focus:outline-2 focus:outline-accent"
          >
            Skip to main content
          </a>
          <Header />
          <BackendBanner />
          <ErrorBoundary>
            {/* Use <div> instead of <main> — each page owns its own <main> landmark */}
            <div className="site-container">{children}</div>
          </ErrorBoundary>
          <Footer />
        </AuthProviderClient>
      </body>
    </html>
  );
}
