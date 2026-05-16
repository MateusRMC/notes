"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const THEME_COLORS = {
  light: "#ffffff",
  dark: "#111111",
};

function setBrowserThemeColor(theme) {
  const color = THEME_COLORS[theme] || THEME_COLORS.light;

  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", color);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  setBrowserThemeColor(theme);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";

    setThemeState(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  function setTheme(nextTheme) {
    setThemeState(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
