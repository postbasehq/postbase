/*
 * Dark by default, across the marketing site and the app. Once someone uses the
 * theme toggle, their choice is saved and wins. Runs inline in <head> so the
 * theme is set before first paint.
 */

export const THEME_KEY = "postbase-theme";

const SCRIPT = `(function(){var r=document.documentElement,t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t==="light"||t==="dark"){r.setAttribute("data-theme",t);r.setAttribute("data-theme-user","")}else r.setAttribute("data-theme","dark")})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
