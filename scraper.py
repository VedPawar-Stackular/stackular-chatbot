#!/usr/bin/env python3
"""
Stackular Website Scraper — Playwright Edition
================================================
The site is a pure React (Create React App) SPA — all content is injected
by JavaScript at runtime. requests/BeautifulSoup can never see it.
This script uses a real headless browser (Playwright) to render every page
and extract the actual content.

SETUP (one time only):
-----------------------
    pip install playwright
    playwright install chromium

RUN:
----
    python stackular_scraper.py

OUTPUT:
-------
    stackular_content.md
"""

import asyncio
import re
import time
from collections import deque
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, TimeoutError as PWTimeout

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL    = "https://www.stackular.com"
OUTPUT_FILE = "stackular_content.md"
DELAY       = 1.2          # seconds between page visits
TIMEOUT     = 20_000       # ms — how long to wait for page to render
MAX_PAGES   = 200

SKIP_PATHS = {"/privacy-policy", "/terms", "/cookie", "/cdn-cgi"}
SKIP_EXTS  = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf",
              ".zip", ".ico", ".woff", ".woff2", ".mp4", ".webp"}

# ── URL helpers ───────────────────────────────────────────────────────────────

def normalise(url: str) -> str:
    p = urlparse(url)
    path = p.path.rstrip("/") or "/"
    return p._replace(fragment="", query="", path=path).geturl()

def same_domain(url: str) -> bool:
    host = urlparse(url).netloc
    return host in ("", "www.stackular.com", "stackular.com")

def should_skip(url: str) -> bool:
    path = urlparse(url).path.lower()
    if any(path.endswith(ext) for ext in SKIP_EXTS):
        return True
    return any(s in path for s in SKIP_PATHS)

def clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# ── Content extractor ─────────────────────────────────────────────────────────

async def extract_content(page) -> str:
    """
    Pull structured Markdown from the rendered React page.
    We query the DOM directly via JavaScript for accuracy.
    """
    content = await page.evaluate("""() => {
        const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG',
                                   'IFRAME','IMG','BUTTON','INPUT',
                                   'TEXTAREA','SELECT','FORM','NAV',
                                   'FOOTER','HEADER']);
        const BLOCK_CLASSES = /nav|menu|footer|header|cookie|banner|modal|popup|sidebar/i;

        function shouldSkip(el) {
            if (SKIP_TAGS.has(el.tagName)) return true;
            const cls = el.className || '';
            if (typeof cls === 'string' && BLOCK_CLASSES.test(cls)) return true;
            return false;
        }

        function nodeToMd(el, depth) {
            if (!el) return '';
            if (el.nodeType === Node.TEXT_NODE) {
                return el.textContent.replace(/\\s+/g, ' ').trim();
            }
            if (el.nodeType !== Node.ELEMENT_NODE) return '';
            if (shouldSkip(el)) return '';

            const tag = el.tagName;
            const children = Array.from(el.childNodes);
            const childText = () => children.map(c => nodeToMd(c, depth+1))
                                            .filter(Boolean).join(' ').trim();
            const childBlocks = () => children.map(c => nodeToMd(c, depth+1))
                                              .filter(Boolean).join('\\n\\n');

            if (tag === 'H1') return '\\n\\n# ' + childText() + '\\n';
            if (tag === 'H2') return '\\n\\n## ' + childText() + '\\n';
            if (tag === 'H3') return '\\n\\n### ' + childText() + '\\n';
            if (tag === 'H4') return '\\n\\n#### ' + childText() + '\\n';
            if (tag === 'H5') return '\\n\\n##### ' + childText() + '\\n';
            if (tag === 'H6') return '\\n\\n###### ' + childText() + '\\n';
            if (tag === 'P')  return '\\n\\n' + childText() + '\\n';
            if (tag === 'BR') return '\\n';
            if (tag === 'HR') return '\\n\\n---\\n';

            if (tag === 'STRONG' || tag === 'B') {
                const t = childText();
                return t ? '**' + t + '**' : '';
            }
            if (tag === 'EM' || tag === 'I') {
                const t = childText();
                return t ? '*' + t + '*' : '';
            }

            if (tag === 'A') {
                const href = el.getAttribute('href') || '';
                const text = childText();
                if (text && href && !href.startsWith('javascript')) {
                    return '[' + text + '](' + href + ')';
                }
                return text;
            }

            if (tag === 'LI') {
                return '- ' + childText();
            }
            if (tag === 'UL' || tag === 'OL') {
                const items = Array.from(el.querySelectorAll(':scope > li'))
                    .map(li => '- ' + li.innerText.replace(/\\s+/g,' ').trim())
                    .filter(Boolean);
                return items.length ? '\\n\\n' + items.join('\\n') + '\\n' : '';
            }

            if (tag === 'TABLE') {
                const rows = Array.from(el.querySelectorAll('tr')).map(tr => {
                    const cells = Array.from(tr.querySelectorAll('th,td'))
                        .map(td => td.innerText.replace(/\\s+/g,' ').trim());
                    return '| ' + cells.join(' | ') + ' |';
                });
                if (rows.length > 0) {
                    const sep = '| ' + rows[0].split('|').slice(1,-1)
                                               .map(() => '---').join(' | ') + ' |';
                    rows.splice(1, 0, sep);
                }
                return rows.length ? '\\n\\n' + rows.join('\\n') + '\\n' : '';
            }

            // Generic container — recurse
            return childBlocks();
        }

        // Find the best content root
        const root = (
            document.querySelector('main') ||
            document.querySelector('[id="root"] > div') ||
            document.querySelector('[id="root"]') ||
            document.body
        );

        return nodeToMd(root, 0);
    }""")

    if not content:
        return ""

    # Clean up whitespace
    content = re.sub(r" {2,}", " ", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip()


async def collect_links(page, current_url: str):
    """Get all internal links from the rendered page."""
    hrefs = await page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.getAttribute('href'))
                    .filter(Boolean);
    }""")

    links = set()
    for href in hrefs:
        if href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        full = normalise(urljoin(current_url, href))
        if same_domain(full) and not should_skip(full):
            links.add(full)
    return links


# ── Crawler ───────────────────────────────────────────────────────────────────

async def crawl():
    visited, queue, pages = set(), deque([normalise(BASE_URL)]), []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 900},
        )
        # Block images/fonts/media to speed things up
        await context.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in ("image", "media", "font", "stylesheet")
            else route.continue_()
        )

        page = await context.new_page()
        print(f"\nStarting crawl of {BASE_URL}\n")

        while queue and len(visited) < MAX_PAGES:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            print(f"  PAGE: {url}")
            try:
                await page.goto(url, wait_until="networkidle", timeout=TIMEOUT)
                # Extra wait for React to finish rendering
                await page.wait_for_timeout(800)
            except PWTimeout:
                print("       TIMEOUT — skipping")
                continue
            except Exception as e:
                print(f"       ERROR: {e}")
                continue

            title = await page.title()
            content = await extract_content(page)

            if content and len(content) > 100:
                pages.append((url, title or url, content))
                print(f"       OK — {len(content)} chars extracted")
            else:
                print("       WARNING: No content found")

            links = await collect_links(page, url)
            for link in links:
                if link not in visited:
                    queue.append(link)

            await asyncio.sleep(DELAY)

        await browser.close()

    print(f"\nDone: {len(pages)} pages extracted ({len(visited)} visited)\n")
    return pages


# ── Markdown writer ───────────────────────────────────────────────────────────

def write_markdown(pages: list, path: str):
    lines = [
        "# Stackular — Full Website Content",
        f"> Extracted from {BASE_URL}",
        f"> Pages scraped: {len(pages)}",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
    ]
    for i, (url, title, _) in enumerate(pages, 1):
        pth = urlparse(url).path or "/"
        lines.append(f"{i}. **{title}** — `{pth}`")
    lines += ["", "---", ""]

    for url, title, content in pages:
        lines += [
            f"# {title}",
            f"> Source: {url}",
            "",
            content,
            "",
            "---",
            "",
        ]

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Saved -> {path}")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pages = asyncio.run(crawl())
    if pages:
        write_markdown(pages, OUTPUT_FILE)
        print(f"\nDone! Open '{OUTPUT_FILE}' for your content.")
    else:
        print("\nNothing extracted.")