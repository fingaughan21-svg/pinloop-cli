# The Ritual (demo)

A first-person, pixel-art horror survival game for the browser. It uses a
Wolfenstein/DOOM-style raycaster and is built around classic online ritual
horror stories.

This demo contains **Level 1: The Midnight Man** and **Level 2: The Elevator**.
Levels 3 and 4 (The Hooded Man, Three Kings) appear on the menu but are locked.

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

**Endings:** Won (3:33 a.m. free), Survived Not Won (salt circle), Greatest Fear (hallucination), and six death endings.

## Level 2: The Elevator

Hollis Tower, 2:14 a.m. Call the elevator and ride **4, 2, 6, 2, 10** alone, then **5**, then **1**.

- **Ride alone.** At most stops someone walks (or runs) toward the doors. Close them in time (panel, or C while
  using it). If anyone gets on, the sequence breaks and the car takes you back to the ground floor.
  Pressing the wrong floor also breaks it. Three breaks and the building takes you.
- Some floors are wrong: a corridor of people facing the walls, a figure that waits at the end of the hall.
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
| Rules / pause | J / Esc | RULES / II |

## Code layout
- `js/renderer.js`: raycaster (textured walls, floors and ceilings, sprites, banded lighting, post effects)
- `js/textures.js`: procedural pixel-art textures and sprites
- `js/map.js`: house layout, switches, props and item placement
- `js/level1.js`: ritual steps, rules, the Midnight Man's AI, endings
- `js/level2.js`: the elevator, its floors, the woman, the Other World
- `js/common.js`: shared movement and stamina, and the swing-meter relight
- `js/textures2.js`: new Midnight Man, jumpscare faces, Level 2 art
- `js/audio.js`: synthesized WebAudio (whispers, heartbeat, knocks, chimes)
- `js/input.js`: keyboard, mouse and touch input
- `js/main.js`: menus, HUD, state machine

Mobile: touch controls are already built in. For app-store builds, wrap the
folder with Capacitor or Cordova.
