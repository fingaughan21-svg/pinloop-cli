// Level 1 house layout. Floor letters double as room ids.
//  c corridor  s study  r bedroom  b bathroom  k kitchen  h entrance hall  l living room
(function (RT) {
  const GRID = [
    '########################',
    '#ssssss#rrrrrrrr#bbbbbb#',
    '#ssssss#rrrrrrrr#bbbbbb#',
    '#ssssss#rrrrrrrr#bbbbbb#',
    '#ssssss#rrrrrrrr#bbbbbb#',
    '#ssssss#rrrrrrrr#bbbbbb#',
    '###c#######c#######c####',
    '#cccccccccccccccccccccc#',
    '#cccccccccccccccccccccc#',
    '#####c######hh######c###',
    '#kkkkkkkk#hhhh#llllllll#',
    '#kkkkkkkk#hhhh#llllllll#',
    '#kkkkkkkkhhhhhhllllllll#',
    '#kkkkkkkk#hhhh#llllllll#',
    '#kkkkkkkk#hhhh#llllllll#',
    '#kkkkkkkk#hhhh#llllllll#',
    '#kkkkkkkk#hhhh#llllllll#',
    '###########D############',
  ];

  const ROOM_NAMES = { c: 'Upstairs Corridor', s: 'Study', r: 'Bedroom', b: 'Bathroom', k: 'Kitchen', h: 'Entrance Hall', l: 'Living Room' };

  // Wall-face decorations. Face = side of the wall block you are looking at
  // (N face is seen from the cell above it, S from below, etc.).
  const DECALS = [
    { x: 4, y: 6, f: 'N', kind: 'switch', room: 's' },
    { x: 12, y: 6, f: 'N', kind: 'switch', room: 'r' },
    { x: 20, y: 6, f: 'N', kind: 'switch', room: 'b' },
    { x: 11, y: 9, f: 'N', kind: 'switch', room: 'c' },
    { x: 6, y: 9, f: 'S', kind: 'switch', room: 'k' },
    { x: 12, y: 17, f: 'N', kind: 'switch', room: 'h' },
    { x: 21, y: 9, f: 'S', kind: 'switch', room: 'l' },
    { x: 11, y: 17, f: 'N', kind: 'frontDoor' },
    { x: 0, y: 3, f: 'E', kind: 'window' },
    { x: 10, y: 0, f: 'S', kind: 'window' }, { x: 13, y: 0, f: 'S', kind: 'window' },
    { x: 23, y: 3, f: 'W', kind: 'windowFrost' },
    { x: 0, y: 13, f: 'E', kind: 'window' }, { x: 4, y: 17, f: 'N', kind: 'window' },
    { x: 23, y: 12, f: 'W', kind: 'window' }, { x: 18, y: 17, f: 'N', kind: 'window' }, { x: 21, y: 17, f: 'N', kind: 'window' },
    { x: 0, y: 7, f: 'E', kind: 'window' }, { x: 23, y: 8, f: 'W', kind: 'window' },
    { x: 14, y: 11, f: 'E', kind: 'portrait' }, { x: 7, y: 6, f: 'S', kind: 'landscape' },
    { x: 16, y: 9, f: 'N', kind: 'portrait' }, { x: 7, y: 3, f: 'E', kind: 'landscape' },
    { x: 16, y: 3, f: 'E', kind: 'mirror' }, { x: 9, y: 14, f: 'E', kind: 'landscape' },
  ];

  // Props. h = world height (walls are 1.0). item = something you can take.
  const PROPS = [
    // study
    { tex: 'desk', x: 2.5, y: 1.45, h: 0.5, solid: 0.45, item: 'paper', special: 'desk' },
    { tex: 'chair', x: 2.5, y: 2.3, h: 0.55, solid: 0.2 },
    { tex: 'bookshelf', x: 5.6, y: 1.3, h: 1.0, solid: 0.35 },
    { tex: 'bookshelf', x: 6.6, y: 2.6, h: 1.0, solid: 0.35 },
    { tex: 'armchair', x: 5.4, y: 4.5, h: 0.55, solid: 0.4 },
    // bedroom
    { tex: 'bed', x: 10.6, y: 2.0, h: 0.45, solid: 0.6, special: 'bed' },
    { tex: 'nightstand', x: 8.5, y: 1.5, h: 0.45, solid: 0.3, item: 'matches2' },
    { tex: 'wardrobe', x: 14.9, y: 1.5, h: 1.0, solid: 0.45 },
    { tex: 'plant', x: 15.4, y: 4.6, h: 0.6, solid: 0.25 },
    // bathroom
    { tex: 'bathtub', x: 21.3, y: 2.2, h: 0.42, solid: 0.6 },
    { tex: 'toilet', x: 19.5, y: 1.4, h: 0.5, solid: 0.3 },
    { tex: 'sink', x: 17.5, y: 3.5, h: 0.7, solid: 0.3, item: 'needle' },
    // corridor
    { tex: 'plant', x: 1.5, y: 7.5, h: 0.6, solid: 0.25 },
    { tex: 'lamp', x: 22.5, y: 7.4, h: 1.0, solid: 0.2 },
    { tex: 'cabinet', x: 8.5, y: 7.3, h: 0.45, solid: 0.3 },
    // kitchen
    { tex: 'fridge', x: 1.5, y: 10.5, h: 1.0, solid: 0.45 },
    { tex: 'counter', x: 2.6, y: 10.4, h: 0.6, solid: 0.35, item: 'matches' },
    { tex: 'stove', x: 3.6, y: 10.4, h: 0.6, solid: 0.35 },
    { tex: 'counter', x: 7.5, y: 10.4, h: 0.6, solid: 0.35 },
    { tex: 'table', x: 4.5, y: 13.5, h: 0.55, solid: 0.5, item: 'salt' },
    { tex: 'chair', x: 3.4, y: 13.5, h: 0.55, solid: 0.2 },
    { tex: 'chair', x: 5.6, y: 13.5, h: 0.55, solid: 0.2 },
    // entrance hall
    { tex: 'clock', x: 10.4, y: 14.6, h: 1.0, solid: 0.25 },
    { tex: 'coatrack', x: 13.5, y: 10.5, h: 0.95, solid: 0.2 },
    { tex: 'cabinet', x: 13.5, y: 15.6, h: 0.45, solid: 0.3, item: 'flashlight' },
    // living room
    { tex: 'tv', x: 18.5, y: 10.4, h: 0.7, solid: 0.35 },
    { tex: 'coffeetable', x: 18.5, y: 13.0, h: 0.25, solid: 0.35, item: 'lighter' },
    { tex: 'sofa', x: 18.5, y: 14.6, h: 0.5, solid: 0.55 },
    { tex: 'armchair', x: 21.4, y: 12.4, h: 0.55, solid: 0.4 },
    { tex: 'sideboard', x: 16.4, y: 16.5, h: 0.55, solid: 0.4, item: 'candle' },
    { tex: 'lamp', x: 22.4, y: 16.4, h: 1.0, solid: 0.2 },
    { tex: 'plant', x: 15.5, y: 10.5, h: 0.6, solid: 0.25 },
  ];

  RT.Map = {
    GRID, ROOM_NAMES, DECALS, PROPS,
    W: GRID[0].length, H: GRID.length,
    FRONT_DOOR: { x: 11, y: 17 },
    OFFERING_POS: { x: 11.5, y: 16.55 },
    START: { x: 12.5, y: 4.2, a: -Math.PI / 2 + Math.PI },
  };
})(window.RT);
