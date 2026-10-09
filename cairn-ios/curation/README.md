# Route picks and difficulty ratings

`peaks.csv` has one row for every Munro, Corbett, Fiona, Wainwright, Welsh 3000er and Furth.
Open it in Numbers, Excel or Google Sheets and fill in the columns you want. Leave anything
blank that you haven't decided yet; the app shows "not rated yet" or "no route picked yet".

| Column | What to put |
| --- | --- |
| `dobih_id` | Don't change: it's how the app finds the hill. |
| `name`, `list`, `metres`, `region` | For reference only. |
| `difficulty` | 1 to 5 (see below). |
| `alltrails_title` | Short route name, e.g. `Mountain Track from Glen Nevis`. |
| `alltrails_url` | The AllTrails link, e.g. `https://www.alltrails.com/trail/scotland/highland/...` |
| `alltrails_title_2`, `alltrails_url_2` | Optional second route (e.g. a harder alternative). |
| `route_note` | Optional short note from you, shown under the routes. |

Difficulty: **1** Beginner · **2** Moderate · **3** Challenging · **4** Strenuous ·
**5** Strenuous+ (Grade 2 scrambling or harder).

To get an AllTrails link, open the trail on alltrails.com (or tap Share → Copy Link in the
AllTrails app) and paste it in.

## Putting your changes into the app

Save the file as CSV (keep the name `peaks.csv`), then from the `cairn-ios` folder run:

```sh
python3 scripts/apply_curation.py
```

It checks every row, warns about mistakes (like a difficulty of 6 or a link that isn't
AllTrails), and writes `Cairn/Resources/curation.json`. Build the app again to see them.

Or just send me the spreadsheet and I'll do this step for you.

`python3 scripts/make_curation_template.py` adds rows for any hills that are missing,
without touching what you've filled in.
