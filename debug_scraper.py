#!/usr/bin/env python3
"""
Debug script — run this FIRST to inspect what the site actually returns.
Output: debug_output.txt
"""
import json
import re
import requests
from bs4 import BeautifulSoup

# ── Paste the same cookies you used in scraper.py ─────────────────────────────
COOKIE_STRING = """
_ga=GA1.1.1207438419.1772449556; _ga_GT57HC6EG7=GS2.1.s1778742748$o39$g1$t1778746136$j60$l0$h0
"""
# ─────────────────────────────────────────────────────────────────────────────

URL = "https://www.stackular.com/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,en-IN;q=0.8",
    "Referer": "https://www.stackular.com/",
    "Upgrade-Insecure-Requests": "1",
}

def parse_cookies(s):
    c = {}
    for part in s.strip().split(";"):
        if "=" in part:
            k, _, v = part.strip().partition("=")
            c[k.strip()] = v.strip()
    return c

session = requests.Session()
session.cookies.update(parse_cookies(COOKIE_STRING))

print(f"Fetching {URL} ...")
resp = session.get(URL, headers=HEADERS, timeout=20)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type','?')}")
print(f"Response size: {len(resp.text)} chars")

soup = BeautifulSoup(resp.text, "html.parser")

report = []
report.append("=" * 70)
report.append("STACKULAR DEBUG REPORT")
report.append("=" * 70)

# 1. Page title
title = soup.find("title")
report.append(f"\n[TITLE]\n{title.get_text() if title else 'NOT FOUND'}")

# 2. Check for __NEXT_DATA__
next_data_tag = soup.find("script", id="__NEXT_DATA__")
report.append(f"\n[__NEXT_DATA__ script present?] {'YES' if next_data_tag else 'NO'}")
if next_data_tag:
    try:
        nd = json.loads(next_data_tag.string)
        report.append(f"[__NEXT_DATA__ top-level keys] {list(nd.keys())}")
        # Dump first 3000 chars so we can see the structure
        report.append(f"\n[__NEXT_DATA__ first 3000 chars]\n{next_data_tag.string[:3000]}")
    except Exception as e:
        report.append(f"[__NEXT_DATA__ parse error] {e}")

# 3. All <script> tag IDs and types
script_tags = soup.find_all("script")
report.append(f"\n[SCRIPT TAGS FOUND] {len(script_tags)}")
for s in script_tags[:20]:
    sid   = s.get("id", "")
    stype = s.get("type", "")
    ssrc  = s.get("src", "")
    snippet = (s.string or "")[:80].replace("\n", " ")
    report.append(f"  id={sid!r:20} type={stype!r:20} src={ssrc!r:40} snippet={snippet!r}")

# 4. HTML tag structure overview (first 200 tags)
report.append(f"\n[BODY TAG STRUCTURE — first 150 tags]")
body = soup.find("body")
if body:
    for i, tag in enumerate(body.descendants):
        if i > 150:
            break
        if hasattr(tag, "name") and tag.name:
            cls   = " ".join(tag.get("class", []))[:60]
            tid   = tag.get("id", "")
            report.append(f"  <{tag.name}> id={tid!r:20} class={cls!r}")

# 5. Raw HTML first 5000 chars
report.append(f"\n[RAW HTML — first 5000 chars]\n{resp.text[:5000]}")

# 6. Raw HTML last 2000 chars
report.append(f"\n[RAW HTML — last 2000 chars]\n{resp.text[-2000:]}")

output = "\n".join(report)
with open("debug_output.txt", "w", encoding="utf-8") as f:
    f.write(output)

print("\nDebug report saved to: debug_output.txt")
print("Send that file back and I'll fix the scraper to match this site's structure.")