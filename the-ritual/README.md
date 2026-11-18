# The Ritual (demo)

A first-person, pixel-art horror survival game for the browser. It uses a
Wolfenstein/DOOM-style raycaster and is built around classic online ritual
horror stories.

This demo contains **Level 1: The Midnight Man**. Levels 2 to 4 (The Elevator,
The Hooded Man, Three Kings) appear on the menu but are locked.

## Run it

There's no build step and there are no asset files: textures, sprites and
sound are all generated in code. Serve the folder over HTTP and open it:

```bash
cd the-ritual && python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk also
works in most browsers.

### Debug URL options
- `?skip` jumps past the pre-ritual straight to 12:00 a.m.
- `?speed=20` runs the game clock 20x faster.
- You can combine them: `?skip&speed=20`.

## Level 1: The Midnight Man

**Pre-ritual (untimed; the clock reads 11:59 p.m.)**
1. Write your full name (first, middle, last) at the study desk.
2. Prick your finger with the needle from the bathroom first-aid kit and add your blood.
3. Find the candle, matches and salt.
4. Turn off all 7 light switches (one per room, next to each doorway).
5. At the wooden front door, lay down the paper, set the candle on it and light it.
6. Knock 22 times. The final knock is 12:00 a.m.
7. Open the door, blow out the candle, close the door.
8. Relight your candle. The clock starts.

**Survive from 12:00 to 3:33 a.m.** One in-game hour lasts 5 real minutes, so a full night is about 17m45s.
- The candle blows out whenever he's near. Relight it within **10 seconds** (R). Each match has a chance to fail.
- If you miss that window, hold **Q** within 5 seconds to pour a salt circle. You survive, but you're trapped until 3:33, so you don't win.
- Fail both and he shows you your greatest fear until 3:33.
- Signs he's close: frost on the screen and fogged breath, whispering that comes from his direction, and a black figure in the candlelight.
- If you stay in one area for 25 seconds he finds you. If you run, he hears you.
- Breaking a rule kills you instantly: turning on a light, using the flashlight, lying down in bed, idling too long (falling asleep), or reaching out to him. The lighter just won't light the candle.

**Endings:** Won (3:33 a.m. free), Survived Not Won (salt circle), Greatest Fear (hallucination), and six death endings.

## Controls
| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move / look | WASD + mouse (click to capture), arrows | Left thumb stick, right-side drag |
| Run | Shift | Push stick to the edge |
| Use / pick up | E / left click | USE |
| Relight | R | RELIGHT |
| Salt circle | Hold Q | SALT |
| Wait it out | Hold Space | WAIT |
| Flashlight | F | TORCH |
| Rules / pause | J / Esc | RULES / II |

## Code layout
- `js/renderer.js`: raycaster (textured walls, floors and ceilings, sprites, banded lighting, post effects)
- `js/textures.js`: procedural pixel-art textures and sprites
- `js/map.js`: house layout, switches, props and item placement
- `js/level1.js`: ritual steps, rules, the Midnight Man's AI, endings
- `js/audio.js`: synthesized WebAudio (whispers, heartbeat, knocks, chimes)
- `js/input.js`: keyboard, mouse and touch input
- `js/main.js`: menus, HUD, state machine

Mobile: touch controls are already built in. For app-store builds, wrap the
folder with Capacitor or Cordova.
