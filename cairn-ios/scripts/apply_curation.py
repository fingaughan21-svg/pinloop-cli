#!/usr/bin/env python3
"""Turn curation/peaks.csv into Cairn/Resources/curation.json, which the app reads.

Rows with no difficulty, trail or note are skipped. Run this after editing the CSV:

    python3 scripts/apply_curation.py
"""
import csv
import json
import pathlib
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV = ROOT / "curation" / "peaks.csv"
OUT = ROOT / "Cairn" / "Resources" / "curation.json"


def trail(row, title_key, url_key, line, problems):
    url = (row.get(url_key) or "").strip()
    if not url:
        return None
    host = urlparse(url).netloc.lower()
    if urlparse(url).scheme != "https" or not (host == "alltrails.com" or host.endswith(".alltrails.com")):
        problems.append(f"line {line}: {url_key} is not an https AllTrails link: {url}")
        return None
    title = (row.get(title_key) or "").strip() or f"{row['name']} on AllTrails"
    return {"title": title, "url": url}


def main():
    hills = json.loads((ROOT / "Cairn" / "Resources" / "hills.json").read_text(encoding="utf-8"))
    known = {h["id"] for h in hills["hills"]}
    peaks, problems = {}, []

    with open(CSV, newline="", encoding="utf-8-sig") as f:
        for line, row in enumerate(csv.DictReader(f), start=2):
            try:
                hill_id = int(row["dobih_id"])
            except (TypeError, ValueError):
                problems.append(f"line {line}: dobih_id is not a number")
                continue
            if hill_id not in known:
                problems.append(f"line {line}: no hill with dobih_id {hill_id}")
                continue

            difficulty = None
            raw = (row.get("difficulty") or "").strip()
            if raw:
                if raw in {"1", "2", "3", "4", "5"}:
                    difficulty = int(raw)
                else:
                    problems.append(f"line {line} ({row['name']}): difficulty must be 1-5, got {raw!r}")

            trails = [t for t in (trail(row, "alltrails_title", "alltrails_url", line, problems),
                                  trail(row, "alltrails_title_2", "alltrails_url_2", line, problems)) if t]
            note = (row.get("route_note") or "").strip() or None

            if difficulty or trails or note:
                peaks[str(hill_id)] = {"difficulty": difficulty, "trails": trails, "note": note}

    for p in problems:
        print("warning:", p, file=sys.stderr)
    OUT.write_text(json.dumps({"peaks": peaks}, ensure_ascii=False, indent=1), encoding="utf-8")
    rated = sum(1 for p in peaks.values() if p["difficulty"])
    linked = sum(1 for p in peaks.values() if p["trails"])
    print(f"{len(peaks)} peaks curated ({rated} rated, {linked} with AllTrails routes) -> {OUT}")


if __name__ == "__main__":
    main()
