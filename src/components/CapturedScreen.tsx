import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadRouteHTML, type RouteKey } from "@/captured-routes";
import tamaguiCSS from "@/captured/tamagui.css?raw";

/**
 * Renders one captured Benable screen inside an iframe.
 *
 * Rationale for the iframe over inline injection:
 *  - The captured DOM is the *runtime output* of Tamagui + react-native-web,
 *    which assumes (a) the body is the viewport (100vw × 100vh, overflow
 *    hidden), and (b) Tamagui's CSS variables / classes live at document
 *    root. Injecting into a div in our React app breaks both: our `#root`
 *    sits inside our own layout, and Tamagui rules like `r-13awgt0` (RNW's
 *    `flex:1`) cascade unpredictably when the container is sized differently.
 *  - Inside an iframe we have a separate document. We set <html>/<body> to
 *    iPhone viewport size and let Tamagui's flex chain resolve exactly the
 *    way it did in the original capture.
 *  - As a bonus: absolutely-positioned images that wanted to fill the
 *    viewport now only fill the iframe — they can't bleed outside the phone
 *    frame.
 *
 * srcdoc carries the full HTML document (Tamagui CSS + per-route markup) so
 * the iframe loads synchronously without an extra network roundtrip.
 *
 * Internal navigation
 * -------------------
 * The captured DOM has no JS. To make tapping a tab / row / button actually
 * feel responsive, we mount a click-delegation listener inside the iframe
 * after load. It matches known nav targets (bottom tab labels, settings
 * rows, brand-collab tabs, "View Details", etc.) by text/role and posts a
 * route name to the parent window. The parent navigates React Router.
 */

const FONT_BASE = (() => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base;
})();

const RESOLVED_CSS = tamaguiCSS.replaceAll("/__BASE__/", `${FONT_BASE}/`);

/**
 * @font-face declarations that the staging Expo build emits in a separate
 * <style id="expo-generated-fonts"> block. Our preprocessor only extracts
 * the tamagui-css <style> block, so without re-injecting these here, the
 * captured DOM falls back to system fonts (Inter is set as font-family
 * everywhere but no face is registered → browser renders sans-serif /
 * Helvetica → it looks "wrong").
 *
 * Weights match Tamagui's weighted-face model exactly: family "Inter" with
 * font-weight 400/500/600/700/800/900 picks up Regular/Medium/SemiBold/
 * Bold/ExtraBold/Black; family "National2" with 400/700/800 picks up
 * Regular/Bold/ExtraBold; same for National2Narrow.
 */
const WEIGHTED_FONT_FACES = `
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 400; src: url("${FONT_BASE}/fonts/Inter-Regular.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 500; src: url("${FONT_BASE}/fonts/Inter-Medium.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 600; src: url("${FONT_BASE}/fonts/Inter-SemiBold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 700; src: url("${FONT_BASE}/fonts/Inter-Bold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 800; src: url("${FONT_BASE}/fonts/Inter-ExtraBold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: normal; font-weight: 900; src: url("${FONT_BASE}/fonts/Inter-Black.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: italic; font-weight: 400; src: url("${FONT_BASE}/fonts/Inter-Italic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: italic; font-weight: 500; src: url("${FONT_BASE}/fonts/Inter-MediumItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: italic; font-weight: 600; src: url("${FONT_BASE}/fonts/Inter-SemiBoldItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "Inter"; font-style: italic; font-weight: 800; src: url("${FONT_BASE}/fonts/Inter-ExtraBoldItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: normal; font-weight: 400; src: url("${FONT_BASE}/fonts/National2-Regular.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: italic; font-weight: 400; src: url("${FONT_BASE}/fonts/National2-RegularItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: normal; font-weight: 700; src: url("${FONT_BASE}/fonts/National2-Bold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: italic; font-weight: 700; src: url("${FONT_BASE}/fonts/National2-BoldItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: normal; font-weight: 800; src: url("${FONT_BASE}/fonts/National2-ExtraBold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2"; font-style: italic; font-weight: 800; src: url("${FONT_BASE}/fonts/National2-ExtraBoldItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2Narrow"; font-style: normal; font-weight: 400; src: url("${FONT_BASE}/fonts/National2Narrow-Regular.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2Narrow"; font-style: italic; font-weight: 400; src: url("${FONT_BASE}/fonts/National2Narrow-RegularItalic.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2Narrow"; font-style: normal; font-weight: 700; src: url("${FONT_BASE}/fonts/National2Narrow-Bold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2Narrow"; font-style: normal; font-weight: 800; src: url("${FONT_BASE}/fonts/National2Narrow-ExtraBold.otf") format("opentype"); font-display: swap; }
  @font-face { font-family: "National2Narrow"; font-style: italic; font-weight: 800; src: url("${FONT_BASE}/fonts/National2Narrow-ExtraBoldItalic.otf") format("opentype"); font-display: swap; }
`;

/**
 * Lookup table for text → destination route. The injected click handler
 * matches the *exact* text content of an element. Order matters: more
 * specific matches first.
 */
const TEXT_NAV_MAP: Record<string, string> = {
  // Bottom tab bar
  "Discover": "/discover",
  "Notifications": "/notifications",
  "Profile": "/profile",

  // Notifications sub-tabs
  "Likes": "/notifications/likes",
  "Comments": "/notifications/comments",
  "Followers": "/notifications/followers",

  // Settings rows (root)
  "Account": "/settings/account",
  "Cashback": "/settings/cashback",

  // Dashboard / brand-collabs entry
  "Brand Collabs": "/brand-collabs",
  "Brand partners": "/dashboard/brand-partners",
  "Tune-up": "/dashboard/tune-up",
  "Request payout": "/dashboard/request-payout",
  "Insights": "/dashboard/insights",

  // Growth
  "Invite friends": "/invite-friends",
  "Start trending": "/start-trending",

  // Bernadette + list
  "Bernadette Noel": "/bernadette",
  "Skincare-must have": "/bernadette/lists/skincare-must-have",

  // Campaign entry from card
  "View Details": "/campaign/78",
};

/**
 * Build the wire-up script that runs inside the iframe after load. It walks
 * the DOM, registers a single delegated click listener on the body, and
 * matches clicks against the text → route map. When a match is found, the
 * iframe posts a message to the parent which navigates React Router.
 */
function buildNavScript(): string {
  return `
    (function() {
      const MAP = ${JSON.stringify(TEXT_NAV_MAP)};
      function findRoute(target) {
        // Walk up: if any ancestor's textContent (when its child count is 0)
        // matches a known label, return its route. Also check immediate
        // descendants for the case where the click hits a parent wrapper.
        let n = target;
        for (let i = 0; i < 8 && n; i++) {
          const t = (n.textContent || '').trim();
          if (MAP[t]) return MAP[t];
          // For role="tab" with aria-label
          if (n.getAttribute && n.getAttribute('role') === 'tab') {
            const label = n.getAttribute('aria-label');
            if (label === 'New')      return '/brand-collabs/new';
            if (label === 'Active')   return '/brand-collabs';
            if (label === 'Finished') return '/brand-collabs/finished';
          }
          // Back arrow: aria-label
          if (n.getAttribute && n.getAttribute('aria-label') === 'Back') return '__back__';
          n = n.parentElement;
        }
        return null;
      }
      document.addEventListener('click', function(e) {
        const route = findRoute(e.target);
        if (route) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ benableNavigate: route }, '*');
        }
      }, true);
    })();
  `;
}

function buildDocument(innerHTML: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0; padding: 0;
        height: 100%; width: 100%;
        overflow: hidden;
        background: #FFFFFF;
        font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
      }
      ${WEIGHTED_FONT_FACES}
      ${RESOLVED_CSS}
      [class*="_pos-fixed"][class*="_zi-1000"][class*="_t-0px"] { display: none !important; }
    </style>
  </head>
  <body>
    ${innerHTML}
    <script>${buildNavScript()}</script>
  </body>
</html>`;
}

export function CapturedScreen({ routeKey }: { routeKey: RouteKey }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [doc, setDoc] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);

  // Listen for navigation messages from the iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object" || !("benableNavigate" in data)) return;
      const target = (data as { benableNavigate: string }).benableNavigate;
      if (target === "__back__") {
        history.back();
        return;
      }
      navigate(target);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setDoc(null);
    loadRouteHTML(routeKey)
      .then((html) => {
        if (cancelled) return;
        setDoc(buildDocument(html));
        setStatus("ready");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setErr(e.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [routeKey]);

  return (
    <div
      className="benable-captured-root"
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        overflow: "hidden",
        background: "#FAFAFA",
      }}
    >
      {status === "loading" && (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading {routeKey}…
        </div>
      )}
      {status === "error" && (
        <div className="flex h-full w-full items-center justify-center p-8 text-sm text-destructive">
          Failed to load {routeKey}: {err}
        </div>
      )}
      {doc && (
        <iframe
          ref={iframeRef}
          title={routeKey}
          srcDoc={doc}
          // allow-scripts is required for our injected nav-wireup script to run
          sandbox="allow-same-origin allow-scripts"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      )}
    </div>
  );
}
