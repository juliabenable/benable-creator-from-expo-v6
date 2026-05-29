import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app/globals.css";

// Captured Tamagui atomic CSS — 478KB extracted once from the scrape, shared
// across every screen. Loaded as a raw string so we can swap the __BASE__
// placeholder for the actual Vite BASE_URL before injecting.
import tamaguiCSS from "./captured/tamagui.css?raw";

function injectTamaguiCSS() {
  const baseRaw = import.meta.env.BASE_URL.replace(/\/$/, "");
  // The preprocessor wrote `/__BASE__/fonts/Inter-X.otf`; in dev that maps to
  // `/fonts/Inter-X.otf` and in the gh-pages deploy to
  // `/benable-creator-from-expo/fonts/Inter-X.otf`.
  const css = tamaguiCSS.replaceAll("/__BASE__/", `${baseRaw}/`);
  const style = document.createElement("style");
  style.setAttribute("data-href", "tamagui-css");
  style.textContent = css;
  document.head.appendChild(style);
}

injectTamaguiCSS();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
