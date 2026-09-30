import { THEME_KEY } from "@/lib/theme";

/*
 * Dark by default, across the marketing site and the app. Once someone picks a
 * theme (header toggle or Settings), their choice is saved and wins; "system"
 * leaves the attribute off so the OS setting applies. Runs inline in <head> so
 * the theme is set before first paint.
 */

const SCRIPT = `(function(){var r=document.documentElement,t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t==="light"||t==="dark"){r.setAttribute("data-theme",t);r.setAttribute("data-theme-user","")}else if(t==="system"){r.setAttribute("data-theme-user","")}else r.setAttribute("data-theme","dark")})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
