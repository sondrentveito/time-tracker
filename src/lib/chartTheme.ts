"use client";

import { useState, useEffect } from "react";

export interface ChartTheme {
  accent: string;
  ok: string;
  warn: string;
  danger: string;
  fg: string;
  fgMuted: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  gridStroke: string;
}

const getThemeColors = (): ChartTheme => {
  if (typeof window === "undefined") {
    return {
      accent: "#818cf8",
      ok: "#34d399",
      warn: "#fbbf24",
      danger: "#fb7185",
      fg: "#f0f0f5",
      fgMuted: "rgba(255, 255, 255, 0.4)",
      cardBg: "rgba(255, 255, 255, 0.03)",
      cardBorder: "rgba(255, 255, 255, 0.06)",
      cardHover: "rgba(255, 255, 255, 0.05)",
      gridStroke: "rgba(255, 255, 255, 0.06)",
    };
  }

  const root = document.documentElement;
  const computed = getComputedStyle(root);
  
  const getVar = (name: string, fallback: string) => 
    computed.getPropertyValue(name).trim() || fallback;

  return {
    accent: getVar("--accent", "#818cf8"),
    ok: getVar("--ok", "#34d399"),
    warn: getVar("--warn", "#fbbf24"),
    danger: getVar("--danger", "#fb7185"),
    fg: getVar("--fg", "#f0f0f5"),
    fgMuted: getVar("--fg-muted", "rgba(255, 255, 255, 0.4)"),
    cardBg: getVar("--card-bg", "rgba(255, 255, 255, 0.03)"),
    cardBorder: getVar("--card-border", "rgba(255, 255, 255, 0.06)"),
    cardHover: getVar("--card-hover", "rgba(255, 255, 255, 0.05)"),
    gridStroke: getVar("--divider", "rgba(255, 255, 255, 0.06)"),
  };
};

export const useChartTheme = (): ChartTheme => {
  const [theme, setTheme] = useState<ChartTheme>(getThemeColors);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "data-theme" || mutation.attributeName === "class")
        ) {
          setTheme(getThemeColors());
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    const handleThemeChange = () => {
      setTheme(getThemeColors());
    };
    window.addEventListener("theme-change", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);

  return theme;
};
