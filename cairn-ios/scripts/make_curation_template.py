#!/usr/bin/env python3
"""Create curation/peaks.csv: one row per peak on the main lists, ready to fill in.

Only adds rows for peaks not already in the file, so it never overwrites your work.

    python3 scripts/make_curation_template.py
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
HILLS = ROOT / "Cairn" / "Resources" / "hills.json"
CSV = ROOT / "curation" / "peaks.csv"
LISTS = ["munros", "corbetts", "fionas", "wainwrights", "welsh-3000s", "furths"]
FIELDS = ["dobih_id", "name", "list", "metres", "region",
          "difficulty", "alltrails_title", "alltrails_url",
          "alltrails_title_2", "alltrails_url_2", "route_note"]


def main():
    data = json.loads(HILLS.read_text(encoding="utf-8"))
    names = {l["id"]: l["name"] for l in data["lists"]}

    existing = []
    if CSV.exists():
        with open(CSV, newline="", encoding="utf-8-sig") as f:
            existing = list(csv.DictReader(f))
    have = {row["dobih_id"] for row in existing}

    added = 0
    rows = list(existing)
    for list_id in LISTS:
        members = sorted((h for h in data["hills"] if list_id in h["lists"]), key=lambda h: -h["metres"])
        for h in members:
            if str(h["id"]) in have:
                continue
            have.add(str(h["id"]))
            rows.append({"dobih_id": h["id"], "name": h["name"], "list": names[list_id],
                         "metres": h["metres"], "region": h["region"]})
            added += 1

    CSV.parent.mkdir(exist_ok=True)
    # utf-8-sig so Excel shows Gaelic and Welsh names correctly.
    with open(CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"{added} new rows, {len(rows)} total -> {CSV}")


if __name__ == "__main__":
    main()
