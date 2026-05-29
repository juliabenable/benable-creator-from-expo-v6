#!/usr/bin/env python3
"""
Preprocess captured Expo Web HTML for the rebuild.

Input:  ../.recon/expo-capture/screens/*.html (raw scrapes from Playwright)
Output: src/captured/
  - tamagui.css        — the 478KB inline Tamagui atomic CSS, extracted once
                         and shared across every screen
  - <route>.html       — per-route HTML with:
                           * <html>, <head>, <body> wrappers stripped
                           * inline <style> extracted (now external)
                           * staging banner div removed
                           * Inter font URLs rewritten to /fonts/Inter-*.otf
                           * `srcSet` attribute removed (browser-only Expo Image
                             quirk that breaks Vite's HTML parsing)
  - manifest.json      — { routeKey: { file, source } }

Routes are explicit so the React Router config doesn't have to guess.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CAPTURES = REPO.parent / ".recon" / "expo-capture" / "screens"
OUT = REPO / "src" / "captured"
OUT.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------------
# Route plan
# Each entry: routeKey -> (source HTML file, route path, label)
# routeKey is what the React app uses internally; path is the React Router URL.
# ----------------------------------------------------------------------------
ROUTES = [
    # key,                            source file,                              path,                                              label
    ("sign-up",                       "00-sign-up.html",                        "/sign-up",                                        "Sign up"),
    ("sign-in",                       "02-sign-in.html",                        "/sign-in",                                        "Sign in"),
    ("discover",                      "01-discover.html",                       "/discover",                                       "Discover"),
    ("notifications",                 "04-notifications.html",                  "/notifications",                                  "Notifications"),
    ("profile",                       "05-profile.html",                        "/profile",                                        "Profile (empty)"),
    ("dashboard",                     "06-dashboard.html",                      "/dashboard",                                      "Dashboard"),
    ("dashboard-insights",            "12-dashboard-insights.html",             "/dashboard/insights",                             "Dashboard › Insights"),
    ("dashboard-cashback",            "13-dashboard-cashback.html",             "/dashboard/cashback",                             "Dashboard › Cashback"),
    ("global-search",                 "08-global-search.html",                  "/global-search",                                  "Global search"),
    ("bookmarks",                     "09-bookmarks.html",                      "/bookmarks",                                      "Bookmarks"),
    ("settings",                      "10-settings.html",                       "/settings",                                       "Settings"),
    ("user-profile",                  "07-profile-bernadette.html",             "/bernadette",                                     "User profile (Bernadette)"),
    ("list-detail",                   "14-list-detail.html",                    "/bernadette/lists/skincare-must-have",             "List detail"),
    ("brand-collabs",                 "11-brand-collabs.html",                  "/brand-collabs",                                  "Brand Collabs › Active"),
    ("brand-collabs-new",             "18-brand-collabs-new.html",              "/brand-collabs/new",                              "Brand Collabs › New"),
    ("brand-collabs-finished",        "19-brand-collabs-finished.html",         "/brand-collabs/finished",                         "Brand Collabs › Finished"),
    ("campaign-respond-to-invite",    "21-campaign-respond-to-invite.html",     "/campaign/78",                                    "Campaign › Respond to invite"),
    ("campaign-product-selection",    "22-step-product-selection.html",         "/campaign/78/product",                            "Campaign › Product selection"),
    ("campaign-delivery-confirm",     "23-step-delivery-confirm.html",          "/campaign/78/delivery",                           "Campaign › Confirm address"),
    ("campaign-delivery-awaiting",    "24-step-delivery-awaiting.html",         "/campaign/78/awaiting-tracking",                  "Campaign › Awaiting tracking"),
    ("campaign-delivery-shipped",     "26-step-delivery-shipped.html",          "/campaign/78/shipped",                            "Campaign › Shipped"),
    ("campaign-content-prompt",       "28-step-content-upload-prompt.html",     "/campaign/78/content",                            "Campaign › Content prompt"),
    ("campaign-add-content",          "29-step-content-add-form.html",          "/campaign/78/add-content",                        "Campaign › Add content form"),
    ("campaign-content-submitted",    "33-step-content-ready-to-submit.html",   "/campaign/78/ready-to-submit",                    "Campaign › Draft ready"),
    ("campaign-under-review",         "34-step-content-under-review.html",      "/campaign/78/under-review",                       "Campaign › Under review"),
    ("campaign-changes-requested",    "35-step-changes-requested.html",         "/campaign/78/changes-requested",                  "Campaign › Changes requested"),
    ("campaign-time-to-post",         "36-step-publish-time-to-post.html",      "/campaign/78/time-to-post",                       "Campaign › Time to post"),
    ("campaign-congrats",             "38-step-publish-congrats.html",          "/campaign/78/congrats",                           "Campaign › Congrats"),

    # v5 additions: notifications sub-tabs, dashboard sub-pages, onboarding,
    # invite + optimized-badge feature, settings deep tree
    ("notifications-likes",           "40-notifications-likes.html",            "/notifications/likes",                            "Notifications › Likes"),
    ("notifications-comments",        "41-notifications-comments.html",         "/notifications/comments",                         "Notifications › Comments"),
    ("notifications-followers",       "42-notifications-followers.html",        "/notifications/followers",                        "Notifications › Followers"),
    ("invite-friends",                "43-invite-friends.html",                 "/invite-friends",                                 "Invite friends"),
    ("dashboard-brand-partners",      "44-dashboard-brand-partners.html",       "/dashboard/brand-partners",                       "Dashboard › Brand partners"),
    ("dashboard-tune-up",             "45-dashboard-tune-up.html",              "/dashboard/tune-up",                              "Dashboard › Tune-up"),
    ("optimized-badge",               "46-optimized-badge.html",                "/optimized-badge",                                "Optimized badge"),
    ("start-trending",                "47-start-trending.html",                 "/start-trending",                                 "Start trending (onboarding)"),
    ("settings-profile",              "48-settings-profile.html",               "/settings/profile",                               "Settings › Profile"),
    ("settings-account",              "49-settings-account.html",               "/settings/account",                               "Settings › Account"),
    ("settings-notifications",        "50-settings-notifications.html",         "/settings/notifications",                         "Settings › Notifications"),
    ("bookmarked-clips",              "51-bookmarked-clips.html",               "/bookmarked-clips",                               "Bookmarked clips"),
    ("settings-cashback",             "52-settings-cashback.html",              "/settings/cashback",                              "Settings › Cashback"),
    ("dashboard-request-payout",      "53-dashboard-request-payout.html",       "/dashboard/request-payout",                       "Dashboard › Request payout"),
]

# ----------------------------------------------------------------------------
# CSS / asset rewriting
# ----------------------------------------------------------------------------

# Map captured font URL → local path. Vite's BASE_URL is injected at runtime
# by the React app, so we use a placeholder here that gets replaced when the
# CSS is loaded into the page.
FONT_URL_RE = re.compile(
    r'/assets/__node_modules/@tamagui/font-inter/otf/(Inter-[A-Za-z]+)\.[a-f0-9]+\.otf'
)


def rewrite_fonts(css: str) -> str:
    """Rewrite hashed font URLs to predictable /fonts/Inter-Weight.otf paths."""
    return FONT_URL_RE.sub(r'/__BASE__/fonts/\1.otf', css)


# ----------------------------------------------------------------------------
# HTML stripping
# ----------------------------------------------------------------------------

# Banner uniquely identified by its fixed-position + zi-1000 + space-between
# class combo. Greedy-but-balanced parse: walk forward, tracking <div>/</div>
# depth, return slice from banner-start to matching-close.
BANNER_OPEN_RE = re.compile(
    r'<div class="_dsp-flex[^"]*?_pos-fixed[^"]*?_zi-1000[^"]*?">'
)


def strip_staging_banner(html: str) -> str:
    m = BANNER_OPEN_RE.search(html)
    if not m:
        return html
    start = m.start()
    depth = 0
    i = start
    while i < len(html):
        if html.startswith('<div', i):
            depth += 1
            # advance past this opening tag
            close = html.find('>', i)
            if close == -1:
                break
            i = close + 1
        elif html.startswith('</div>', i):
            depth -= 1
            i += len('</div>')
            if depth == 0:
                return html[:start] + html[i:]
        else:
            i += 1
    return html  # bail if unbalanced


# Extract everything inside <div id="root">…</div>.
# Body has just `<noscript>...</noscript>` plus the root div.
ROOT_OPEN = '<div id=\\"root\\">'
ROOT_CLOSE = '</div></body>'


ROOT_OPEN_RE = re.compile(r'<div\s+id="root"[^>]*>')


def extract_root_inner(html: str) -> str:
    """Slice out the inner of <div id="root">. Handles cases where the bake
    pass added attributes (e.g. style="…") to the root div."""
    m = ROOT_OPEN_RE.search(html)
    if not m:
        return html
    inner_start = m.end()
    end = html.rfind('</div></body>')
    if end < 0:
        return html[inner_start:]
    return html[inner_start:end]


# Extract the inline tamagui.css from a <style> block.
STYLE_RE = re.compile(
    r'<style[^>]*data-href=\\?"tamagui-css\\?"[^>]*>(.*?)</style>', re.S
)


def extract_tamagui_css(html: str) -> str | None:
    m = STYLE_RE.search(html)
    return m.group(1) if m else None


# srcSet attribute breaks Vite's HTML import — Vite expects valid HTML and
# barfs on the comma-separated descriptor format. We just strip it (the
# underlying src attribute provides the same image at full res).
SRCSET_RE = re.compile(r'\s+srcSet=\\?"[^"]*\\?"')


def decode_capture(raw: str) -> str:
    """Playwright's `browser_evaluate` saves the JSON-string form: outer `"…"`
    quotes and `\\"` / `\\n` escapes inside. Strip the wrappers and unescape."""
    if raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1]
    return raw.replace('\\"', '"').replace('\\n', '\n')


def pick_source(src: str) -> Path:
    """Source preference order:
      1. `<stem>-full-baked.html` — full computed-style serialization (v3+).
         Pixel-faithful to the live app.
      2. `<stem>-baked.html` — partial bake, dimensions only (v2). Helps with
         image sizing but layout still drifts.
      3. `<stem>.html` — original outerHTML scrape, no bake.
    The preprocessor opportunistically upgrades to better sources without
    requiring edits to the route table."""
    stem = src.rsplit(".html", 1)[0]
    for suffix in ("-full-baked.html", "-baked.html", ".html"):
        candidate = CAPTURES / f"{stem}{suffix}"
        if candidate.exists():
            return candidate
    return CAPTURES / src


# ----------------------------------------------------------------------------
# Driver
# ----------------------------------------------------------------------------

def main() -> int:
    if not CAPTURES.exists():
        print(f"missing captures dir: {CAPTURES}", file=sys.stderr)
        return 1

    # Phase 1: extract CSS once (use discover-baked as the canonical source
    # — every capture has the same 478KB tamagui CSS inlined).
    canonical = pick_source("01-discover.html")
    canonical_raw = canonical.read_text()
    canonical_html = decode_capture(canonical_raw)
    css = extract_tamagui_css(canonical_html)
    if not css:
        print("could not extract tamagui CSS from canonical", file=sys.stderr)
        return 1
    css_out = rewrite_fonts(css)
    (OUT / "tamagui.css").write_text(css_out)
    print(f"  tamagui.css: {len(css_out):,} bytes  (from {canonical.name})")

    # Phase 2: per-route HTML
    manifest = {}
    total = 0
    baked_count = 0
    for key, src, path, label in ROUTES:
        src_path = pick_source(src)
        if not src_path.exists():
            print(f"  SKIP {key}: missing {src}")
            continue
        is_full = "-full-baked" in src_path.name
        is_baked = "-baked" in src_path.name and not is_full
        if is_full or is_baked:
            baked_count += 1
        raw = src_path.read_text()
        html = decode_capture(raw)
        inner = extract_root_inner(html)
        inner = strip_staging_banner(inner)
        # Strip the inline 478KB <style> block — it's deduped to tamagui.css
        # and loaded once globally.
        inner = STYLE_RE.sub('', inner)
        inner = SRCSET_RE.sub('', inner)
        out_path = OUT / f"{key}.html"
        out_path.write_text(inner)
        manifest[key] = {
            "file": f"{key}.html",
            "source": src_path.name,
            "path": path,
            "label": label,
            "bake": "full" if is_full else ("partial" if is_baked else "none"),
        }
        total += len(inner)
        tag = " [FULL]" if is_full else (" [partial]" if is_baked else "")
        print(f"  {key:30s} <- {src_path.name:48s} ({len(inner):>9,} bytes){tag}")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print()
    print(f"Total per-route HTML: {total:,} bytes across {len(manifest)} routes")
    print(f"  {baked_count}/{len(manifest)} routes use layout-baked sources")
    return 0


if __name__ == "__main__":
    sys.exit(main())
