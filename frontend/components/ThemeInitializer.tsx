"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const theme = localStorage.getItem("theme");
    const prefersDark = typeof window.matchMedia === 'function' ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    const html = document.documentElement;

    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else if (theme === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else if (prefersDark) {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
  }, []); // Empty dependency array to run once on mount

  return null; // This component doesn't render anything
}
