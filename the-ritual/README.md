# The Ritual (demo)

A first-person, pixel-art horror survival game for the browser. It uses a
Wolfenstein/DOOM-style raycaster and is built around classic online ritual
horror stories.

This demo contains **Level 1: The Midnight Man**, **Level 2: The Elevator** and
**Level 3: The Hooded Man**. Level 4 (Three Kings) appears on the menu but isn't in the demo.

Each level unlocks when you complete the one before it, and completing a level earns its achievement
(see **Achievements** on the title screen). Progress is saved in the browser. To test any level, enter the
password `admin123` under **Settings → Password**. **Reset progress** is in the same place.

## Run it

There's no build step and there are no asset files: textures, sprites and
sound are all generated in code. Serve the folder over HTTP and open it:

```bash
cd the-ritual && python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk also
works in most browsers.

### Debug URL options
- `?skip` (Level 1 only) jumps past the pre-ritual straight to 12:00 a.m.
- `?speed=20` runs the game clock 20x faster.
- You can combine them: `?skip&speed=20`.

## Level 1: The Midnight Man

**Pre-ritual (untimed; the clock reads 11:59 p.m.)**
Each checklist line shows how far away its target is, and an on-screen marker
points at the current one.
1. Write your full name (first, middle, last) at the study desk.
2. Prick your finger with the needle from the bathroom first-aid kit and add your blood.
3. Find the candle, matches and salt.
4. Turn off all 7 light switches (one per room, next to each doorway).
5. At the wooden front door, lay down the paper, set the candle on it and light it.
6. Knock 22 times (hold E to keep knocking). The final knock is 12:00 a.m.
7. Open the door, blow out the candle, close the door.
8. Relight your candle. The clock starts.

**Survive from 12:00 to 3:33 a.m.** One in-game minute is 2 real seconds, so a full night is about 7 minutes.
Difficulty rises smoothly through the night: he visits more often, moves faster, notices you from further
away, and finds you sooner if you stand still.
- The candle blows out whenever he's near. Relight it within **10 seconds**: press R, then stop the swinging marker
  inside the zone with E or R. Each attempt uses a match. The zone shrinks and the marker speeds up as the night
  goes on, and again when he's close.
- Sprinting (Shift) drains a breath gauge. Empty it and you have to wait for it to refill completely.
- If you miss that window, hold **Q** within 5 seconds to pour a salt circle. You survive, but you're trapped until 3:33, so you don't win.
- Fail both and he shows you your greatest fear until 3:33.
- Signs he's close: frost on the screen and fogged breath, whispering that comes from his direction, and a black figure in the candlelight.
- If you stay in one area for 25 seconds he finds you. If you run, he hears you.
- Breaking a rule kills you instantly: turning on a light, using the flashlight, lying down in bed, idling too long (falling asleep), or reaching out to him. The lighter just won't light the candle.

- **2:30 a.m.: the cellar.** The cellar door in the kitchen unlocks. You must go down, because the house
  turns hostile if you stay (he visits every few seconds). The rest of the night is spent in a maze of
  brick tunnels with a boiler room and a storage room. It's narrower and darker than the house, and he
  visits more often. There are spare matches down there.
- **The salt circle is no longer a place to wait.** There's no fast-forward. He circles you and wears gaps
  in the salt, usually behind you. A ring at the bottom of the screen shows the circle (the top is the way
  you're facing). Turn to face a gap and hold Q to mend it. Salt is limited, he blows your candle out, and
  late in the night he works on two gaps at once. If a gap opens fully, he gets in.

**Endings:** Won (3:33 a.m. free), Survived Not Won (salt circle), Greatest Fear (hallucination), and seven death endings.

## Level 2: The Elevator

Hollis Tower, 2:14 a.m. Call the elevator and ride **4, 2, 6, 2, 10** alone, then **5**, then **1**.
The lobby's front door opens onto a downpour, but you can't leave.

- **Ride alone.** At most stops someone walks (or runs) toward the doors. Close them in time (panel, or C while
  using it). If anyone gets on, the sequence breaks and the car takes you back to the ground floor.
  Pressing the wrong floor also breaks it. Three breaks and the building takes you.
- Some floors are wrong: a flickering corridor of people facing the walls, a figure that waits at the end of the hall.
  Leave the doors open too long and they come.
- **Floor 5: the woman gets on.** Don't look at her: a gaze meter fills when she's near the centre of your
  view. Don't answer when she talks (T). Don't touch her. She only moves when you aren't looking, and sometimes
  she moves right behind you. Press 1. If you lose your nerve, press any other floor before the car reaches 10
  to abort (a separate ending).
- **The Other World:** dark, red, and full of pale figures that only move when nobody is watching them.
  Keep them in your phone's torch beam (F; the battery runs down). Find the red cross, get back in the car,
  and repeat 4, 2, 6, 2, 10, then 1. Something is waiting at every stop on the way back, so close the doors fast.
  A wrong floor on the way home is permanent.

**Endings:** Ground Floor (win), You Stopped It (abort), Lost Between Floors, and six deaths.

## Level 3: The Hooded Man

1:20 a.m., a different house. Follow the printed instructions (J) exactly.

- **Prepare the house.**
  - Wash at the bathroom sink.
  - Put your salt and saint's medal away in the hall drawer, because you must carry nothing protective.
  - Find the two black cords by searching furniture.
  - Shut every window and door, close every curtain, and turn off every light, the TV, the radio and the laptop.
  - Anything left undone is quietly held against you later.
- **The presence.** Every so often a hooded figure stands somewhere in the house and you feel watched.
  Doing *any* ritual step while it's there binds it to you (death). Wait for it to leave.
- **The telephone** (rotary dial: click the digits or type them):
  1. **Count to thirteen** with a rhythm meter: press E as the rings meet. Your pulse must stay under 100,
     so hold SPACE to close your eyes and breathe.
  2. Dial 20496888 without touching the handset.
  3. Tie a cord on, lift the handset, and dial 25515823.
  4. Count again, then put the handset back.
  5. Say the right phrase. The wrong words kill you.
  6. Swap the cords.
- **The cab.**
  1. Burn the first cord in the kitchen sink. This is optional but strongly advised.
  2. Open the front curtains: the sky is tinged and a black cab is waiting.
  3. Take your watch and keys, lock the back door, leave, and lock the front door.
  4. Get in, lock the cab, and breathe until you sleep.
  5. When you wake, check your watch (R). If the house was prepared properly it reads 3:30. If not, it shows
     the real time and you have two minutes to get back inside (a non-winning ending).
- **The ride.**
  - You can only look around and lean forward (W). The road becomes a red wasteland, then a drowned
    city, then nothing.
  - Your **pulse** rises with every scare and when you look at things you shouldn't. Reaching 170
    (panic) kills you, so breathe (SPACE) with your eyes shut.
  - Don't speak (T) or lift his hood: either sends you home, which isn't a win.
  - Don't open the door (death).
  - At two stops someone gets in beside you. Don't answer them (death).
  - After the first passenger leaves, lean in, face him, and whisper (Q) the destination.
  - Ride to the very end and you find out what happens when the cab stops.
- **After.**
  1. At the phone, dial 200082, set the handset aside, and thank him.
  2. Remove the cord, burn it, bury the ashes in the back garden, and salt them (your salt is in the hall drawer).
  3. Wash.
  - If you never burned the first cord, the hooded man is in the house with you. He only moves when you
    aren't looking at him, so burn that cord first.

**Endings:** Thank You for the Ride (win), The Ride Never Came, Sent Home, The Last Stop, and eight deaths.

## Controls
| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move / look | WASD + mouse (click to capture), arrows | Left thumb stick, right-side drag |
| Run | Shift | Push stick to the edge |
| Use / pick up | E / left click | USE |
| Relight | R | RELIGHT |
| Salt circle | Hold Q | SALT |
| Wait it out | Hold Space | WAIT |
| Flashlight / phone torch | F | TORCH |
| Elevator panel | E at the panel, then click or press 1–9, 0 (=10), C close, O open | USE, then tap |
| Talk (don't) | T | TALK |
| Breathe / close your eyes (Level 3) | Hold Space | BREATHE |
| Check your watch (Level 3) | R | WATCH |
| Whisper / lock a door (Level 3) | Q | WHISPER |
| Lean forward in the cab | W | Stick up |
| Rules / pause | J / Esc | RULES / II |

## Code layout
- `js/renderer.js`: raycaster (textured walls, floors and ceilings, sprites, banded lighting, post effects)
- `js/textures.js`: procedural pixel-art textures and sprites
- `js/map.js`: house layout, switches, props and item placement
- `js/level1.js`: ritual steps, rules, the Midnight Man's AI, endings
- `js/level2.js`: the elevator, its floors, the woman, the Other World
- `js/common.js`: shared movement and stamina, and the swing-meter relight
- `js/textures2.js`: new Midnight Man, jumpscare faces, Level 2 art, the cellar
- `js/level3.js`, `js/textures3.js`: the Hooded Man
- `js/map.js`: also generates the fixed-seed cellar maze
- `js/audio.js`: synthesized WebAudio (whispers, heartbeat, knocks, chimes)
- `js/input.js`: keyboard, mouse and touch input
- `js/main.js`: menus, HUD, state machine

Mobile: touch controls are already built in. For app-store builds, wrap the
folder with Capacitor or Cordova.
