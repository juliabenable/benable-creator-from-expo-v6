#!/usr/bin/env python3
"""Quick helper: regenerate just one captured route from a baked source.
Usage: scripts/process-one.py <source.html> <route-key>"""
import sys
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CAP = REPO.parent / ".recon" / "expo-capture" / "screens"
OUT = REPO / "src" / "captured"

FONT_URL_RE = re.compile(
    r'/assets/__node_modules/@tamagui/font-inter/otf/(Inter-[A-Za-z]+)\.[a-f0-9]+\.otf'
)
BANNER_OPEN_RE = re.compile(
    r'<div class="_dsp-flex[^"]*?_pos-fixed[^"]*?_zi-1000[^"]*?">'
)
STYLE_RE = re.compile(
    r'<style[^>]*data-href=\\?"tamagui-css\\?"[^>]*>(.*?)</style>', re.S
)
SRCSET_RE = re.compile(r'\s+srcSet=\\?"[^"]*\\?"')


def strip_staging_banner(html):
    m = BANNER_OPEN_RE.search(html)
    if not m:
        return html
    start, depth, i = m.start(), 0, m.start()
    while i < len(html):
        if html.startswith('<div', i):
            depth += 1
            i = html.find('>', i) + 1
            if i == 0:
                break
        elif html.startswith('</div>', i):
            depth -= 1
            i += len('</div>')
            if depth == 0:
                return html[:start] + html[i:]
        else:
            i += 1
    return html


ROOT_OPEN_RE = re.compile(r'<div\s+id="root"[^>]*>')


def extract_root_inner(html):
    m = ROOT_OPEN_RE.search(html)
    if not m:
        return html
    inner_start = m.end()
    end = html.rfind('</div></body>')
    if end < 0:
        return html[inner_start:]
    return html[inner_start:end]


def decode_capture(raw):
    # Playwright's `browser_evaluate` returns the result as a JSON-encoded
    # string when saved to a file: leading + trailing `"` and `\"` / `\n`
    # escapes throughout. Strip the outer quotes and unescape.
    if raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1]
    return raw.replace('\\"', '"').replace('\\n', '\n')


if __name__ == "__main__":
    src, key = sys.argv[1], sys.argv[2]
    raw = (CAP / src).read_text()
    html = decode_capture(raw)
    inner = extract_root_inner(html)
    inner = strip_staging_banner(inner)
    inner = STYLE_RE.sub('', inner)
    inner = SRCSET_RE.sub('', inner)
    (OUT / f"{key}.html").write_text(inner)
    print(f"{key}.html: {len(inner):,} bytes (from {src})")
