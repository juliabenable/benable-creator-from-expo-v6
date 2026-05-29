# Engineering asks — for the Benable mobile team

> **Updated for v5.** This doc lists what would help, ranked by impact.
> Most asks are read-only.
>
> Live v5 prototype:
> [juliabenable.github.io/benable-creator-from-expo-v5](https://juliabenable.github.io/benable-creator-from-expo-v5/)
> (40 of 42 routes pixel-faithful to staging, captured from
> `https://benable--staging.expo.app`).

## What's no longer a problem

The original v1 ask was "fix visual fidelity." That's **solved without your
help**, by inlining every computed CSS property on every element during
capture. See `README.md` § "v3 changelog" for the technique. So the prototype
already *looks* like the real app — we don't need source access purely for
that anymore.

## What is now the blocker

The remaining gap is **iteration**, not fidelity. Right now each route is a
static snapshot. To genuinely *use* this as a prototype where Julia can
swap data, tweak copy, or remix layouts, we'd need to move from "captured
HTML chunks" to "real React components driven by typed props." That's the
work where engineering help still matters most.

Tiered asks, in impact order:

## 🥇 Highest impact

**A) Read access to the RN/Expo source repo** (or just `app/`,
`components/`, `design-system/`, `theme/`). Lets us:
- Componentize the highest-traffic screens (Discover feed, Campaign step
  bar, Rec card, List card, Tab bar) with real props.
- Pull the Tamagui design tokens directly instead of inferring them.
- Replace the captured-HTML approach incrementally per screen.

**B) Storybook (if one exists), even private/internal.** Even one story per
core component (BButton, CircularActionButton, the campaign-step-progress
bar, the rec card, the list card) is enough to start.

**C) Tamagui theme export.** CSS vars or TS module — colors, spacing,
typography, radii, shadows. We've inferred a lot from the captured CSS
(see `tamagui.css`) but a canonical source is faster.

## 🥈 Big help

**D) Better demo accounts.** `nisarg@beneble.org` is empty in some places:
- Profile shows 0 public lists
- Dashboard hits 401 on `/api/brand_collabs/v1/creator/profile`
- Image-upload from Playwright doesn't persist to the server (blob URLs
  die after reload), so we can't drive the campaign flow past Submit-for-
  Review

A second creator login with rich data, OR populating nisarg with a couple
of public lists and a campaign mid-flow, would let us capture the
remaining "happy path" states (`under_review`, `changes_requested`,
`time_to_post`) properly.

**E) JS bundle source maps.** Currently
`/_expo/static/js/web/index-*.js` ships without sourcemaps. With them
we can extract component-level code from the bundle.

**F) Component prop docs for the obvious targets:** `BButton` (every
variant — we see `is_BButton` classes everywhere), `CircularActionButton`,
the campaign step-progress bar, the rec card, the list card, the tab bar.

## 🥉 Useful

**G) Multiple campaigns set up at each named state.** We have "Step 1
through Step 9" campaigns named for their target state. If those names
matched the actual server-side state of each, I could capture the
review-gate states without admin intervention.

**H) Public asset URL list.** The empty-state illustrations,
campaign-step icons, brand placeholders — anywhere we can mirror or
hot-link?

**I) An `EXPO_USE_STATIC=1` server-rendered build of staging**, if
expo-router static export is set up. Would give us layout-baked HTML for
free.

**J) Storybook hosted somewhere** with `?args=` URLs to render any
component in any state.

## What we don't need

- Production data dumps. Mock data is fine.
- Real user emails/photos beyond what's in staging seed data.
- Backend / API access — the prototype is fully static.

## Specific yes/no questions

If you only have 15 minutes, these narrow the next round most:

1. Is there a Storybook for the design system? Where?
2. Does the design system have a public-or-internal docs page? Link?
3. Are there RN-Web snapshot tests in the repo? They'd give us exactly
   the layout-baked DOM we wrote ourselves to scrape.
4. Is Expo configured with sourcemaps in any env we can point Playwright at?
5. Could the staging build expose a `?bakeLayout=1` query param that
   inlines `getBoundingClientRect()` on render, behind a feature flag?
   (We could PR this if accepted — but turns out we don't strictly need
   it anymore since our scrape script does the same job.)
6. What's the Tamagui theme exported as? CSS vars? A TS module? Both?

## References

- Live v5 deploy:
  https://juliabenable.github.io/benable-creator-from-expo-v5/
- Captured raw scrapes sit in
  `/Users/julia/Documents/Benable Coding/.recon/expo-capture/` —
  53 HTML/PNG/YAML triples covering 42 routes, plus a `sitemap.md` of all
  89 Expo Router routes if you want to suggest more priorities.

---

If you can only do one thing → §A (repo access). That's the difference
between "interactive prototype" and "static screenshot deck."
