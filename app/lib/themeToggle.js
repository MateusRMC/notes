"use client";

import { useTheme } from "./themeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <img
      src={theme === "dark" ? "/lightmode.svg" : "darkmode.svg"}
      className="themeToggle"
      onClick={toggleTheme}
    />
  );
}
