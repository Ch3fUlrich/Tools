import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import AuthProviderClient from "@/components/auth/AuthProviderClient";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeInitializer from "@/components/ThemeInitializer";
import BackendBanner from "@/components/ui/BackendBanner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  // Base for resolving all relative metadata URLs (canonical, og:url, …).
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: './',
    locale: 'en',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Site supports both schemes via CSS variables (see globals.css).
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0b1a' },
  ],
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
