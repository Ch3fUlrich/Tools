import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth";

export const metadata: Metadata = {
  title: "Tools Collection",
  description: "A collection of useful tools for everyday tasks",
};

export default function RootLayoutTestable({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
