"use client";

import { useLayoutEffect } from "react";

/*
 * Marketing pages default to light, whatever the system theme; the app keeps
 * following the system. The inline script sets it before first paint on a full
 * load; the layout effect covers client-side navigation into the marketing
 * pages and hands the theme back to the system on the way out. Once someone
 * uses the theme toggle (data-theme-user), their choice wins.
 */

const SET_LIGHT = `(function(){var r=document.documentElement;if(!r.hasAttribute("data-theme-user"))r.setAttribute("data-theme","light")})()`;

export function MarketingThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SET_LIGHT }} />;
}

export function MarketingTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-theme-user")) root.setAttribute("data-theme", "light");
    return () => {
      if (!root.hasAttribute("data-theme-user")) root.removeAttribute("data-theme");
    };
  }, []);
  return null;
}
