# benable-creator-from-expo

> Static scrape + rebuild of the **Benable Creator** flow, sourced from the
> Expo Web staging deploy at https://benable--oblk3lwrkg.expo.app

This is a different artifact from the earlier `creator-prototype-besttryyet-v1`,
which was a rebuild of a **design preview** prototype. This one is sourced
from the actual production React Native codebase rendered to web via Expo.

## What's in here

```
public/fonts/        Inter OTF family mirrored from Tamagui's font-inter package
                     (10 weights, ~2.7MB)
src/captured/
  tamagui.css        Single 478KB extracted Tamagui atomic CSS, shared across
                     every route (was inline & identical in every scrape).
                     Font URLs were rewritten to /__BASE__/fonts/Inter-*.otf
                     at preprocess time; main.tsx swaps __BASE__ at runtime.
  manifest.json      route key → file/path/label
  *.html             One per route, post-processed:
                       - <html>, <head>, <body>, <noscript> wrappers stripped
                       - inline 478KB <style> extracted to tamagui.css
                       - staging banner div removed
                       - hashed font URLs already rewritten in CSS
                       - srcSet attrs stripped (broke Vite HTML import)
src/captured-routes.ts   Single source of truth for the route list, grouped
                         by section for the dev navigator.
src/components/
  CapturedScreen.tsx     Per-route renderer. Lazily fetches the HTML chunk
                         and renders inside a srcdoc iframe so Tamagui's
                         CSS gets a fresh document context.
  DevNavigator.tsx       Floating top-left route picker, grouped by section.
scripts/process-captures.py
                         The preprocessor. Re-run when you re-scrape.
.recon/expo-capture/     (outside the repo) raw Playwright scrapes —
                         screenshots + outerHTML + accessibility snapshots.
```

## v5 changelog

**Coverage jump: 27 → 42 routes** (40 of 42 with full bake).

New routes captured + processed:
- `/sign-up` and `/sign-in` (clean re-scrape from logged-out state — v4
  used a buggy error-page capture)
- Notifications sub-tabs: `/notifications/likes`, `/comments`, `/followers`
- `/invite-friends`
- Dashboard sub-pages: `/dashboard/brand-partners`, `/tune-up`,
  `/request-payout`
- `/optimized-badge`
- `/start-trending` (onboarding)
- `/bookmarked-clips`
- Settings deep tree: `/settings/profile`, `/account`, `/notifications`,
  `/cashback`

**Dev navigator redesigned.** Smaller footprint (260px wide vs 280),
search box that filters across labels/paths/keys/groups, collapsible
section headers with match counts, per-route bake-status badge:
`●` full / `◐` partial / `◌` missing.

## v4 changelog

- **Full Step-6 campaign walk** captured end-to-end with full bake.
- **24 of 27 routes** now use full-baked sources (up from 18 in v3).
- 6 additional campaign-flow states upgraded to full bake (shipped, modal
  confirm received, content prompt, add-content form, ready to submit,
  congrats).
- Late states `changes_requested` + `time_to_post` keep their original
  Step-8 non-bake captures (the staging image-upload pipeline doesn't accept
  Playwright's `setFiles` flow — blob URLs die after reload, so the campaign
  can't be UI-driven past Submit-for-Review. The admin push that unblocked
  Step 6 jumped straight to congrats, so the intermediate states weren't
  captured).
- Sign-in still uses the v1 error-page capture; needs a clean re-scrape from
  a logged-out session.

## v3 changelog

- **Full computed-style serialization.** The v2 bake only inlined width/height.
  v3 inlines ~75 layout-significant computed properties per element (every
  flex, padding, margin, position, border, font, color, shadow, transform,
  etc.) as `style="…"`. Inline-style specificity beats class rules so the
  iframe renders **pixel-faithful to the live staging app** even though it
  has no JS running.
- **Verified Discover renders identically to live** at 393×852 — Albert
  Perez's "Effective Networking Tips" card with carousel pagination, Amy
  Wahl's house/beach gallery, the real bottom tab bar with Profile avatar.
- **18 of 27 routes upgraded** to full-bake. HTML chunks balloon from 800KB
  to 4.5–13MB raw (gzipped: ~250–400KB per route, lazy-loaded).
- **Preprocessor preference chain:** `-full-baked.html` > `-baked.html` >
  original. Future re-scrapes upgrade transparently.

## v2 changelog

- **Source URL switched** to `https://benable--staging.expo.app` (the canonical
  staging URL, not the preview-deploy URL we used for v1). No more "Previewing
  the staging app on web" banner to strip.
- **Layout-baking re-capture.** For 18 of 27 routes, we re-scraped with a
  small JS pass that inlines `getBoundingClientRect()` as explicit `width:Xpx;
  height:Ypx; position:relative` on every empty-class wrapper, plus explicit
  dimensions on every `<img>`. That fixes the worst v1 symptom (a 32×32 avatar
  rendering at 393×852) without us needing repo access.
- **Sign-up + sign-in** re-scraped cleanly from the logged-out landing.
- **Brand Collabs sub-tabs** captured: `/brand-collabs/new` and
  `/brand-collabs/finished` previously had only PNGs.
- Preprocessor (`scripts/process-captures.py`) opportunistically picks
  `*-baked.html` over the original when both are present, so future
  re-scrapes upgrade without manifest edits.
- 9 late-stage campaign routes (shipped → congrats) still use the original
  Step-8 walk (non-baked). The Step-7 walk used for the early states hits
  the same admin review gate; we'd need a fresh admin-controlled walk to
  bake the tail.

## Routes mapped (25)

Every captured creator screen has a React Router entry + dev-navigator pill.

| Group | Routes |
|---|---|
| Auth | `/sign-in` |
| Tabs | `/discover`, `/notifications`, `/global-search`, `/bookmarks` |
| Profile | `/profile`, `/bernadette`, `/bernadette/lists/skincare-must-have` |
| Settings | `/dashboard`, `/dashboard/insights`, `/dashboard/cashback`, `/settings` |
| Brand Collabs | `/brand-collabs` |
| Campaign flow | **Full 9-state Step-8 walk-through:** Respond-to-invite → Product → Confirm address → Product on its way → Shipped → Content prompt → Add Content form → Draft ready → Under review → Changes requested → Time to post → Congrats |

## Status (v1)

| | |
|---|---|
| ✅ | Project scaffolded (Vite + React 19 + TS + Tailwind v4) matching the in-house pattern |
| ✅ | 25 captured screens preprocessed into per-route HTML chunks |
| ✅ | React Router config with grouped dev navigator |
| ✅ | 478KB Tamagui CSS deduped + injected once globally |
| ✅ | Inter font family mirrored locally (10 OTF weights) |
| ✅ | Captured Tamagui atomic classes match the in-app rules (verified at runtime) |
| ⚠️ | **DOM rendering has runtime-layout drift.** See "Known issues" below. |

## Known issues

### Image sizing — captured DOM expects Tamagui's runtime JS layout

The captured snapshots are the **rendered output** of react-native-web at one
point in time. RN web sets some sizing properties on element **wrappers** at
runtime via JS (after measuring the viewport and prop values), and those
resolved dimensions live in the CSSOM, not the DOM. When we serialize
`document.documentElement.outerHTML`, we lose them.

The most visible symptom: image wrappers (e.g. the `<div>` around an avatar
or post cover) arrive at us with an empty `class` and no inline `style`. The
`<img>` inside has `position: absolute; inset: 0; width: 100%; height: 100%`
— a pattern that's supposed to fill a sized parent. With the parent's runtime
dimensions missing, the IMG sizes to the **next** positioned ancestor —
usually the entire viewport. A 32×32 avatar then renders at 393×852.

**v2 fix:** re-capture by walking the DOM at runtime and inlining
`getBoundingClientRect()` dimensions as `style="position: absolute; left: Xpx;
top: Ypx; width: Wpx; height: Hpx"` on every layout-significant element. That
"bakes" the layout into the serialized DOM. The .recon scrape would balloon
~2–3× but render exactly as the live app does.

**Or v2 alternative:** componentize. Replace `CapturedScreen` with explicit
per-route React components that take typed props. Heavier upfront but cleanly
iterable.

### Other notes

- `/sign-in` capture is actually the "Something went wrong" error page that
  the staging app threw during scraping; needs a re-scrape from a logged-out
  session.
- `/dashboard` shows the loading skeleton — nisarg's account hits a 401 on
  `/api/brand_collabs/v1/creator/profile`. Captured as-is.
- `/profile` shows nisarg's empty state (no public lists). Visit `/bernadette`
  for a populated profile.
- Routes `/brand-collabs/new` and `/brand-collabs/finished` are referenced in
  the source manifest but the HTML wasn't saved at capture time (only PNGs).
  They'll fall through to the default route until re-captured.

## How the capture pipeline works

1. **Playwright scrape** (`.recon/expo-capture/screens/*.html` + `.png`).
   Each route was navigated in a 393×852 viewport with `nisarg@beneble.org`
   logged in. The Step-8 campaign flow was walked end-to-end (admin pushed
   states from the brand side at the review gate).
2. **Preprocess** (`scripts/process-captures.py`). Extracts the shared
   Tamagui CSS once, strips wrappers + the staging banner, rewrites font
   URLs, and emits one `<key>.html` per route plus `manifest.json`.
3. **Runtime** (`src/components/CapturedScreen.tsx`). Lazily imports each
   captured HTML, injects into a srcdoc iframe with the Tamagui CSS so the
   captured DOM renders in its own document context.

## Iteration roadmap

1. **Fix image sizing** — re-capture with computed-style serialization, OR
   start componentizing the highest-value screens (Discover feed, Campaign
   flow steps, Profile).
2. **Re-scrape `/sign-in`** properly from a logged-out session.
3. **Capture missing routes** as needed: `/dashboard/brand-partners`,
   `/dashboard/request-payout`, `/dashboard/tune-up`, `/start-trending`,
   `/invite-friends`, `/optimized-badge*`, full settings tree, social
   challenges, edit flows. Sitemap has 89 routes total.
4. **Populated account** — `nisarg@beneble.org` is too thin for some
   surfaces. Captures of someone like `bernadette` for richer profile +
   list + rec states would help.
