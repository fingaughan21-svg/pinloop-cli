# Cairn (iOS)

A friendly hill-bagging app for iPhone and iPad. Track the Munros, Corbetts, Fionas,
Wainwrights, Welsh 3000ers and more, find hand-picked routes, and share tips with other baggers.
Designed to be clear and comfortable for everyone, from young beginners to retired baggers
chasing their final Munro.

| Area | Lists |
| --- | --- |
| Scotland | Munros (282), Munro Tops (226), Corbetts (222), Fionas / Grahams (231), Donalds (89) |
| Lake District | Wainwrights (214), Outlying Fells (116), Birketts (541) |
| Wales | Welsh 3000ers (15) |
| Britain & Ireland | Furths (34), Hewitts (523), Nuttalls (442), Marilyns (2007) |

## What's in the app

- **Welcome:** on first launch, Cairn asks what you're bagging (Munros, Corbetts, Fionas,
  Wainwrights, Welsh 3000ers, Furths, or other lists) and explains the difficulty scale.
  Change it later in Settings → "Change what I'm bagging".
- **Lists:** progress rings for each list you follow. Inside a list: search, filter by
  bagged / to do / difficulty, sort by height, name or region, and swipe right to bag a hill.
- **Map:** every hill on a list, green to do and gold bagged. Tap a peak for a card with
  its difficulty, **Open in AllTrails**, "I've bagged this", and a link to tips and details.
- **Peak page:** map, difficulty, hand-picked AllTrails routes and route note, directions,
  your ascent log, **top tips** (voted up or down by the community), and **comments with photos**.
- **Nearby:** the closest unbagged hills on your lists.
- **Progress:** totals, highest hill, per-list progress, new hills per year, recent ascents.
- **Settings:** account, heights in metres or feet, difficulty guide, CSV export of your log.

### Difficulty scale (1–5)

| | Level | Meaning |
| --- | --- | --- |
| 1 | Beginner | Clear paths and steady gradients. |
| 2 | Moderate | Longer day with some steep or rough ground. |
| 3 | Challenging | Long, steep or pathless sections; navigation needed. |
| 4 | Strenuous | Big, demanding day on rough mountain terrain. |
| 5 | Strenuous+ | Technical ground: Grade 2 scrambling or harder. |

Wording lives in `Cairn/Models/Difficulty.swift`.

## Running it

Needs a Mac with Xcode 15+; the app targets iOS 17+. The Xcode project is generated with
[XcodeGen](https://github.com/yonaskolb/XcodeGen):

```sh
brew install xcodegen
cd cairn-ios
xcodegen
open Cairn.xcodeproj
```

Pick a simulator and press ⌘R. ⌘U runs the tests. To run on your own iPhone, set your team
under Signing & Capabilities and change the bundle identifier from `com.example.cairn`.

To see the welcome screens again in the simulator, delete the app and run it again.

## Adding routes and difficulty ratings

See [`curation/README.md`](curation/README.md). In short: fill in `curation/peaks.csv`
in Numbers or Excel, then run `python3 scripts/apply_curation.py`.

## Accounts, tips, comments and photos

Out of the box these work **on the device only**, so you can try everything without any
setup: sign in with just a display name, and tips, votes, comments and photos are kept on
that phone.

To share them between everyone, connect a free Supabase backend. See
[`backend/README.md`](backend/README.md). It's about 15 minutes of setup and one line of code.

## Hill data

`Cairn/Resources/hills.json` is generated from the
[Database of British and Irish Hills](https://www.hill-bagging.co.uk/dobih) v18.5,
licensed CC BY 4.0, © the DoBIH contributors. The app credits it in Settings. To update:

```sh
curl -sL -o /tmp/hillcsv.zip https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip
unzip -o /tmp/hillcsv.zip -d /tmp
python3 scripts/build_hills.py /tmp/DoBIH_v18_5.csv --version 18.5
```

## Layout

```
Cairn/
  App/         app entry point, tab bar, theme (colours and button styles)
  Models/      hills, lists, difficulty, route guides, ascents (SwiftData), export, location
  Community/   accounts, tips, votes, comments, photos: on-device and Supabase backends + screens
  Views/       onboarding, lists, peak page, map, nearby, progress, settings
  Resources/   hills.json, curation.json, asset catalog
CairnTests/    unit tests
curation/      peaks.csv: your difficulty ratings and AllTrails links
backend/       Supabase schema for the shared community
scripts/       data build scripts
```

## Before the App Store

- App icon artwork (the asset catalog has an empty slot).
- Connect the shared backend, and decide who reviews reported posts. Apple requires apps with
  user posts to offer reporting (done), blocking abusive users, and a way to remove content.
- A privacy policy covering email addresses, photos and location.
- Ask AllTrails before using their logo; plain "Open in AllTrails" text links are used for now.
