# HillBagger (iOS)

A SwiftUI iPhone/iPad app for hill baggers. It goes beyond Munro bagging, covering
the major British hill lists with offline data and a personal ascent log.

| Area | Lists |
| --- | --- |
| Scotland | Munros (282), Munro Tops (226), Corbetts (222), Fionas / Grahams (231), Donalds (89) |
| Lake District | Wainwrights (214), Outlying Fells (116), Birketts (541) |
| Wales | Welsh 3000ers (15) |
| Britain & Ireland | Furths (34), Hewitts (523), Nuttalls (442), Marilyns (2007) |

## Features

- **Lists:** follow the lists you care about and see a progress ring for each. A hill on
  several lists (e.g. a Munro that's also a Marilyn) only needs bagging once.
- **List detail:** search, filter by bagged / to do, sort by height, name or SMC-style
  region section. Swipe right to bag a hill today.
- **Hill page:** 3D satellite map, height in metres and feet, prominence, grid ref,
  region, every list the hill belongs to, your ascents with date, companions and notes,
  and directions in Apple Maps.
- **Map:** every hill on a chosen list, coloured by bagged / to do, with your location.
- **Nearby:** the 50 closest unbagged hills on your followed lists.
- **Progress:** totals, highest hill, per-list progress, new hills per year, recent ascents.
- **Settings:** metres or feet, CSV export of your ascent log.

Everything runs offline. Ascents are stored on the device with SwiftData.

## Running it

Needs Xcode 15+ and iOS 17+. The Xcode project is generated with
[XcodeGen](https://github.com/yonaskolb/XcodeGen):

```sh
brew install xcodegen
cd hillbagger-ios
xcodegen
open HillBagger.xcodeproj
```

Set your signing team and bundle identifier (`project.yml` uses `com.example.hillbagger`),
then run on a simulator or device. `⌘U` runs the unit tests.

## Hill data

`HillBagger/Resources/hills.json` is generated from the
[Database of British and Irish Hills](https://www.hill-bagging.co.uk/dobih) v18.5,
licensed CC BY 4.0, © the DoBIH contributors. The app credits it on the Settings screen.

To update to a newer DoBIH release, or to add a list, edit `LISTS` in
`scripts/build_hills.py` and run it against the DoBIH CSV:

```sh
curl -sL -o /tmp/hillcsv.zip https://www.hill-bagging.co.uk/dobih-downloads/hillcsv.zip
unzip -o /tmp/hillcsv.zip -d /tmp
python3 scripts/build_hills.py /tmp/DoBIH_v18_5.csv --version 18.5
```

Welsh 3000ers are the DoBIH Furths (3000ft+ outside Scotland) that lie in Wales; Fionas
are the DoBIH Grahams.

## Layout

```
HillBagger/
  App/        app entry point and tab bar
  Models/     Hill, HillList, HillCatalog (bundled data), Ascent (SwiftData), CSV export, location
  Views/      Lists, list detail, hill detail + ascent editor, map, nearby, progress, settings
  Resources/  hills.json, asset catalog
HillBaggerTests/   catalog and export tests
scripts/build_hills.py   regenerates hills.json from DoBIH
```

## Ideas for next steps

- App icon artwork (the asset catalog has an empty slot).
- iCloud sync of ascents (SwiftData + CloudKit).
- GPX route import, and auto-suggesting a bag when a recorded track passes a summit.
- Home-screen widget showing progress on a chosen list.
- Mountain weather (MWIS / Met Office) on the hill page.
