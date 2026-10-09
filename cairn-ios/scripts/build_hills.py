#!/usr/bin/env python3
"""Build Cairn/Resources/hills.json from the Database of British and Irish Hills.

Input is either the DoBIH CSV (https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip)
or a JSON snapshot shaped {"version": ..., "hills": [{number, name, metres, drop, gridRef,
latitude, longitude, region, country, codes: [...]}]}.

    python3 scripts/build_hills.py DoBIH_v18_5.csv --version 18.5

Hill data (c) the DoBIH contributors, licensed CC BY 4.0.
"""
import argparse
import csv
import json
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / "Cairn" / "Resources" / "hills.json"

# Each list: id, display name, short subtitle, area grouping, criteria, and a predicate.
LISTS = [
    ("munros", "Munros", "Scottish 3000ft mountains", "Scotland",
     "Scottish mountains over 3000ft (914.4m) on the SMC's list of separate mountains.",
     lambda h: "M" in h["codes"]),
    ("munro-tops", "Munro Tops", "Subsidiary 3000ft tops", "Scotland",
     "Subsidiary summits over 3000ft that are not separate Munros.",
     lambda h: "MT" in h["codes"]),
    ("corbetts", "Corbetts", "Scottish 2500–3000ft hills", "Scotland",
     "Scottish hills between 2500ft and 3000ft with at least 500ft (152.4m) of drop on all sides.",
     lambda h: "C" in h["codes"]),
    ("fionas", "Fionas", "Grahams: 2000–2500ft hills", "Scotland",
     "Scottish hills between 2000ft and 2500ft with at least 150m of drop, also known as Grahams.",
     lambda h: "G" in h["codes"]),
    ("donalds", "Donalds", "Southern Uplands 2000ft hills", "Scotland",
     "Hills in the Scottish Lowlands of 2000ft or more, as listed by Percy Donald.",
     lambda h: "D" in h["codes"]),
    ("wainwrights", "Wainwrights", "Lake District fells", "Lake District",
     "The 214 fells described in Alfred Wainwright's Pictorial Guides to the Lakeland Fells.",
     lambda h: "W" in h["codes"]),
    ("outlying-fells", "Outlying Fells", "Wainwright's Outlying Fells", "Lake District",
     "The summits from Wainwright's The Outlying Fells of Lakeland.",
     lambda h: "WO" in h["codes"]),
    ("birketts", "Birketts", "Lake District 1000ft+ hills", "Lake District",
     "Lake District hills of 1000ft or more, from Bill Birkett's Complete Lakeland Fells.",
     lambda h: "B" in h["codes"]),
    ("welsh-3000s", "Welsh 3000ers", "The 15 Welsh 3000ft peaks", "Wales",
     "The fifteen summits in Snowdonia/Eryri over 3000ft, traditionally done in one push.",
     lambda h: "F" in h["codes"] and h["country"] == "Wales"),
    ("furths", "Furths", "3000ft peaks outside Scotland", "Britain & Ireland",
     "Mountains over 3000ft in England, Wales and Ireland: the Munros' 'furth'.",
     lambda h: "F" in h["codes"]),
    ("hewitts", "Hewitts", "England, Wales & Ireland 2000ft+", "Britain & Ireland",
     "Hills in England, Wales and Ireland over 2000ft with at least 30m of drop.",
     lambda h: "Hew" in h["codes"]),
    ("nuttalls", "Nuttalls", "England & Wales 2000ft+", "Britain & Ireland",
     "Hills in England and Wales over 2000ft with at least 15m of drop.",
     lambda h: "N" in h["codes"]),
    ("marilyns", "Marilyns", "Hills with 150m prominence", "Britain & Ireland",
     "Hills of any height with at least 150m of drop on all sides.",
     lambda h: "Ma" in h["codes"]),
]


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def load_csv(path):
    hills = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("Classification"):
                codes = [c.strip() for c in row["Classification"].split(",") if c.strip()]
            else:
                codes = [k for k, v in row.items() if v == "1" and k not in ("Number",)]
            hills.append({
                "number": int(row["Number"]), "name": row["Name"],
                "metres": num(row.get("Metres")), "drop": num(row.get("Drop")),
                "gridRef": row.get("Gridref") or row.get("GridrefXY") or "",
                "latitude": num(row.get("Latitude")), "longitude": num(row.get("Longitude")),
                "region": row.get("Region", ""), "country": {"S": "Scotland", "E": "England", "W": "Wales",
                                                             "I": "Ireland"}.get(row.get("Country"), row.get("Country", "")),
                "codes": codes,
            })
    return hills


def main():
    p = argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("--version", default=None)
    a = p.parse_args()

    if a.source.endswith(".json"):
        raw = json.load(open(a.source, encoding="utf-8"))
        hills, version = raw["hills"], a.version or raw.get("version", "")
    else:
        hills, version = load_csv(a.source), a.version or ""

    out_hills = []
    for h in sorted(hills, key=lambda h: h["number"]):
        lists = [lid for lid, *_rest, pred in LISTS if pred(h)]
        if not lists or h["latitude"] is None:
            continue
        out_hills.append({
            "id": h["number"], "name": h["name"], "metres": h["metres"],
            "drop": h["drop"], "gridRef": h["gridRef"],
            "lat": round(h["latitude"], 6), "lon": round(h["longitude"], 6),
            "region": h["region"], "country": h["country"], "lists": lists,
        })

    doc = {
        "source": "Database of British and Irish Hills v" + version,
        "licence": "CC BY 4.0, (c) the DoBIH contributors, https://www.hill-bagging.co.uk/dobih",
        "lists": [{"id": lid, "name": n, "subtitle": s, "area": ar, "criteria": cr,
                   "count": sum(lid in h["lists"] for h in out_hills)}
                  for lid, n, s, ar, cr, _ in LISTS],
        "hills": out_hills,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for l in doc["lists"]:
        print(f'{l["name"]:16} {l["count"]}', file=sys.stderr)
    print(f"{len(out_hills)} hills -> {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
