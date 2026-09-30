/*
 * Theme choice, shared by the header toggle and the Settings picker. Dark is the
 * default (see components/ThemeScript.tsx); "system" drops the attribute so the
 * prefers-color-scheme rules in globals.css apply. Browser-only.
 */

export const THEME_KEY = "postbase-theme";
export const THEME_EVENT = "postbase-theme";

export type ThemeChoice = "dark" | "light" | "system";

export function readThemeChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "system") return t;
  } catch {}
  return "dark";
}

export function applyTheme(choice: ThemeChoice) {
  const r = document.documentElement;
  if (choice === "system") r.removeAttribute("data-theme");
  else r.setAttribute("data-theme", choice);
  r.setAttribute("data-theme-user", "");
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT));
}
