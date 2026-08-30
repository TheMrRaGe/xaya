/**
 * The renderer — the one place floats are allowed (doc/world/PLAN.md §43A).
 * It reads sim state and draws it; it never writes back into it.
 *
 * The Verge outgrew the screen (nine times its original footprint), so this
 * file owns a camera: a `VIEW_W`x`VIEW_H`-tile window, centred on the local
 * soul and clamped to the map's edges, through which everything below is
 * drawn. Nothing upstream of here enforces the fog that makes that camera
 * meaningful rather than decorative — net/snapshot.ts already cut anything
 * too far away out of the data before it reached the wire — so this file's
 * job is only ever "where on screen," never "whether to show at all."
 *
 * The HUD (everything below `drawWorld`/`drawEntities`) was a full-width
 * monospace text block stacked under the viewport, roughly as tall as the
 * map itself. It is now a set of compact overlays drawn on top of the
 * viewport instead — a chrome pass only; nothing about the sim, the tiles,
 * or what data reaches this file changed to make it possible.
 */
import { TILE, clamp } from "../sim/fixed.js";
import { World, WORLD_W, WORLD_H, Tile, isSolid } from "../sim/world.js";
import { isNight, CROW_THRESHOLD, NOTORIOUS_STANDING, DeathEvent } from "../sim/tick.js";
import { Player, Pack, NEED_MAX, HEALTH_MAX } from "../sim/entities.js";
import { Creature, STATS, CreatureKind } from "../sim/creatures.js";
import { Npc } from "../sim/npc.js";
import { Lieutenant } from "../sim/entities.js";
import { DIALOGUE_TREES } from "../sim/dialogue.js";
import { SKILLS, Skill, level, bestSkill, teachingCeiling } from "../sim/skills.js";

export const TILE_PX = 32;

/** The camera's window onto the Verge, in tiles — unchanged since Stage B's first screen, however large the map behind it grows. */
export const VIEW_W = 24;
export const VIEW_H = 16;

/** The camera's top-left corner, in the same fixed-point world units as everything else. */
export interface Camera {
  x: number;
  y: number;
}

/** A camera centred on (focusX, focusY), clamped so it never scrolls past the map's edge. */
export function computeCamera(focusX: number, focusY: number): Camera {
  const viewWUnits = VIEW_W * TILE;
  const viewHUnits = VIEW_H * TILE;
  const maxX = Math.max(0, WORLD_W * TILE - viewWUnits);
  const maxY = Math.max(0, WORLD_H * TILE - viewHUnits);
  return {
    x: clamp(focusX - viewWUnits / 2, 0, maxX),
    y: clamp(focusY - viewHUnits / 2, 0, maxY),
  };
}

/**
 * Everything the renderer is allowed to know. A local SimState satisfies
 * it and so does a snapshot off the wire, which is the point: the client
 * draws what it is told without caring who told it.
 *
 * `players` is sparse — a slot is `null` for a soul fogged out by distance —
 * and `lieutenant` is `null` outright when he is nowhere near enough to see.
 * Both are already decided by the time this file sees them.
 */
export interface ViewState {
  tick: number;
  players: (Player | null)[];
  lieutenant: Lieutenant | null;
  creatures: Creature[];
  npcs: Npc[];
  noise: number;
  crowX: number;
  crowY: number;
  log: string[];
}

const COLORS: Record<Tile, string> = {
  [Tile.Grass]: "#3a5a34",
  [Tile.Tree]: "#1f3d1a",
  [Tile.Stump]: "#5a4632",
  [Tile.Water]: "#2a4a6a",
  [Tile.Bush]: "#4a6a2a",
  [Tile.BareBush]: "#3a3a2a",
  [Tile.Campfire]: "#8a4a1a",
  [Tile.Ash]: "#2b2723",
  [Tile.Rock]: "#6e6e73",
  [Tile.Snare]: "#3a5a34", // grass — a set snare is meant to be easy to lose
  [Tile.Ore]: "#5a5248",
  [Tile.Marsh]: "#3a4a38",
  [Tile.Road]: "#8a7a5e",
  [Tile.Ruin]: "#5c5852",
  [Tile.Clay]: "#9c6b42",
  [Tile.Copper]: "#5a5248", // same rock-dark base as Ore; the flecks below tell them apart
  [Tile.Meadow]: "#5a7a3a",
  [Tile.Thicket]: "#16290f", // darker than Tree — a stand's core, not its fringe
  [Tile.House]: "#3a5a34", // grass — the roof drawn below is what actually reads
};

/** Fuel at which a fire is drawn as embers rather than a blaze. */
const EMBER_FUEL = 200;

/**
 * The world, cropped to whatever `camera` currently frames. Cost is now
 * O(viewport) rather than O(map) — the one part of a nine-times-bigger
 * Verge that got *cheaper* to draw, because there was never a reason to
 * paint the 8/9ths of it currently off screen.
 */
export function drawWorld(ctx: CanvasRenderingContext2D, world: World, tick: number, camera: Camera): void {
  const startX = Math.max(0, Math.floor(camera.x / TILE));
  const startY = Math.max(0, Math.floor(camera.y / TILE));
  // +2 covers the partial tile at the camera's trailing edge plus one for
  // rounding, since the camera is rarely tile-aligned.
  const endX = Math.min(WORLD_W, startX + VIEW_W + 2);
  const endY = Math.min(WORLD_H, startY + VIEW_H + 2);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const t = world.get(x, y);
      const px = toPx(x * TILE, camera.x);
      const py = toPx(y * TILE, camera.y);
      ctx.fillStyle = COLORS[t];
      ctx.fillRect(px, py, TILE_PX, TILE_PX);
      if (t === Tile.Rock) {
        // A boulder or two, so a rock reads as something to work rather
        // than as a hole in the map.
        ctx.fillStyle = "#8c8c92";
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.38, py + TILE_PX * 0.44, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5a5a60";
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.66, py + TILE_PX * 0.62, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t === Tile.Ore) {
        // A vein: two flecks of ore-gold in the dark rock, distinct from a
        // rock outcrop's plain grey boulders at a glance.
        ctx.fillStyle = "#c9a227";
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.4, py + TILE_PX * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.62, py + TILE_PX * 0.6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t === Tile.House) {
        // A wall and a roof, nothing more — a landmark, not a building
        // system. Distinct from Ruin's broken blocks: this one is whole.
        ctx.fillStyle = "#8a6a45";
        ctx.fillRect(px + TILE_PX * 0.15, py + TILE_PX * 0.35, TILE_PX * 0.7, TILE_PX * 0.55);
        ctx.fillStyle = "#5c3d24";
        ctx.beginPath();
        ctx.moveTo(px + TILE_PX * 0.08, py + TILE_PX * 0.38);
        ctx.lineTo(px + TILE_PX * 0.5, py + TILE_PX * 0.08);
        ctx.lineTo(px + TILE_PX * 0.92, py + TILE_PX * 0.38);
        ctx.closePath();
        ctx.fill();
      }
      if (t === Tile.Copper) {
        // Verdigris-green flecks instead of ore-gold — the same "check every
        // stone" logic as Ore, told apart at a glance once you're close.
        ctx.fillStyle = "#4a9a7a";
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.42, py + TILE_PX * 0.42, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.6, py + TILE_PX * 0.58, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t === Tile.Clay) {
        // A darker smear of worked mud, so it doesn't read as plain dirt.
        ctx.fillStyle = "#7a5334";
        ctx.beginPath();
        ctx.ellipse(px + TILE_PX * 0.5, py + TILE_PX * 0.55, 9, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t === Tile.Meadow) {
        // A few flowers — cheap, and the whole reason a meadow reads as
        // something rather than paler grass.
        const petals = ["#e8d84a", "#d888c8", "#e0e0e0"];
        for (let i = 0; i < 3; i++) {
          const fx = px + TILE_PX * (0.25 + i * 0.28);
          const fy = py + TILE_PX * (0.35 + ((i * 37) % 3) * 0.15);
          ctx.fillStyle = petals[i % petals.length]!;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (t === Tile.Thicket) {
        // Denser foliage marks than a plain Tree tile — reads as "more wood,
        // more noise" before a player ever swings at it.
        ctx.fillStyle = "#0e1c09";
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.3, py + TILE_PX * 0.3, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.65, py + TILE_PX * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + TILE_PX * 0.42, py + TILE_PX * 0.72, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t === Tile.Marsh) {
        // A couple of reed tufts and a darker patch of standing water —
        // enough to read as wet ground rather than a stain on the grass.
        ctx.fillStyle = "#26362a";
        ctx.beginPath();
        ctx.ellipse(px + TILE_PX * 0.5, py + TILE_PX * 0.62, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5a6a4a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + TILE_PX * 0.3, py + TILE_PX * 0.4);
        ctx.lineTo(px + TILE_PX * 0.28, py + TILE_PX * 0.22);
        ctx.moveTo(px + TILE_PX * 0.68, py + TILE_PX * 0.44);
        ctx.lineTo(px + TILE_PX * 0.72, py + TILE_PX * 0.24);
        ctx.stroke();
      }
      if (t === Tile.Road) {
        // A worn rut down the middle — a path, not a coat of paint.
        ctx.strokeStyle = "#6e5f46";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, py + TILE_PX * 0.5);
        ctx.lineTo(px + TILE_PX, py + TILE_PX * 0.5);
        ctx.stroke();
      }
      if (t === Tile.Ruin) {
        // Broken blocks, not a building — a soul finds this, not builds it.
        ctx.fillStyle = "#8a857c";
        ctx.fillRect(px + TILE_PX * 0.2, py + TILE_PX * 0.3, 8, 6);
        ctx.fillRect(px + TILE_PX * 0.55, py + TILE_PX * 0.5, 7, 7);
        ctx.fillStyle = "#3a3733";
        ctx.fillRect(px + TILE_PX * 0.2, py + TILE_PX * 0.3, 8, 2);
      }
      if (t === Tile.Snare) {
        // Deliberately faint. A snare you can see from across the map is
        // not a snare, and forgetting where you set one is part of the job.
        ctx.strokeStyle = "rgba(190, 175, 130, 0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (t === Tile.Campfire) {
        // A fire that flickers is a fire you can find from across the map,
        // which is exactly the deal you took when you built it — and one
        // burning down to embers is a warning you can read without a HUD.
        const fuel = world.fuelAt(x, y);
        const life = Math.min(1, fuel / (EMBER_FUEL * 4));
        const flicker = 1.5 + life * 2.5 + Math.sin(tick / 3 + x + y) * (0.4 + life);
        ctx.fillStyle = fuel > EMBER_FUEL ? "#ffcc55" : "#b04a18";
        ctx.beginPath();
        ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, flicker, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** World units, camera-relative, to screen pixels. */
function toPx(units: number, camUnits: number): number {
  return ((units - camUnits) / TILE) * TILE_PX;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, camera: Camera, stroke?: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(toPx(x, camera.x) + TILE_PX / 2, toPx(y, camera.y) + TILE_PX / 2, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature, camera: Camera): void {
  if (c.state === "dead" && c.butchered) return;

  if (c.state === "dead") {
    // A carcass: worth walking back for, and worth nothing once it rots.
    const cx = toPx(c.x, camera.x) + TILE_PX / 2;
    const cy = toPx(c.y, camera.y) + TILE_PX / 2;
    ctx.strokeStyle = "#7a2020";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.moveTo(cx + 6, cy - 6);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.stroke();
    return;
  }

  if (c.kind === "deer") {
    dot(ctx, c.x, c.y, 7, c.state === "flee" ? "#e6d2a8" : "#c8a878", camera);
  } else if (c.kind === "hare") {
    // Small, and nearly always already running.
    dot(ctx, c.x, c.y, 4, c.state === "flee" ? "#d8d0c0" : "#a89880", camera);
  } else if (c.kind === "river-goat") {
    dot(ctx, c.x, c.y, 8, "#cfc8bc", camera, c.state === "flee" ? "#8a7a5a" : undefined);
  } else if (c.kind === "wolf") {
    dot(ctx, c.x, c.y, 7, "#888890", camera, c.state === "hunt" ? "#c02020" : undefined);
  } else {
    dot(ctx, c.x, c.y, 9, "#6b4a2a", camera, c.state === "charge" ? "#c02020" : undefined);
  }
}

/**
 * The crows. They gather over whatever was last loud and drift after it,
 * and the Lieutenant walks toward them — so this is not decoration, it is
 * the detection channel, drawn where the player can read it. Their position
 * is never fogged (net/snapshot.ts) — a flock is heard, not spotted — so
 * this only ever fails to draw them for being off camera, never for being
 * hidden.
 */
function drawCrows(ctx: CanvasRenderingContext2D, state: ViewState, camera: Camera): void {
  if (state.noise < CROW_THRESHOLD) return;
  const strength = Math.min(1, (state.noise - CROW_THRESHOLD) / (1000 - CROW_THRESHOLD));
  const count = 3 + Math.round(strength * 4);
  const cx = toPx(state.crowX, camera.x) + TILE_PX / 2;
  const cy = toPx(state.crowY, camera.y) + TILE_PX / 2;
  const radius = TILE_PX * (1.1 + strength * 0.9);

  ctx.fillStyle = "rgba(10, 10, 12, 0.85)";
  for (let i = 0; i < count; i++) {
    const phase = state.tick / 14 + (i * Math.PI * 2) / count;
    const x = cx + Math.cos(phase) * radius;
    const y = cy + Math.sin(phase) * radius * 0.55;
    // A crow is two strokes of a wing and nothing else at this size.
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.quadraticCurveTo(x - 2, y - 3, x, y);
    ctx.quadraticCurveTo(x + 2, y - 3, x + 4, y);
    ctx.lineTo(x, y + 1.5);
    ctx.closePath();
    ctx.fill();
  }
}

/** Souls are told apart by colour; the one you are driving is the pale one. */
const SOUL_COLORS = ["#e8e0c8", "#88c0e8", "#c8a0e0", "#a0e0a8"];

/** The Teacher gets her own colour; every other villager shares one — they are people, not a bestiary entry each. */
function drawNpc(ctx: CanvasRenderingContext2D, npc: Npc, camera: Camera): void {
  if (!npc.alive) return;
  const fill = npc.role === "teacher" ? "#d8b878" : "#a89878";
  dot(ctx, npc.x, npc.y, 7, fill, camera);
  ctx.fillStyle = "#cfc7b0";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(npc.name, toPx(npc.x, camera.x) + TILE_PX / 2, toPx(npc.y, camera.y) + TILE_PX / 2 - 12);
  ctx.textAlign = "left";
}

export function drawEntities(ctx: CanvasRenderingContext2D, state: ViewState, localId: number, camera: Camera): void {
  for (const c of state.creatures) drawCreature(ctx, c, camera);
  for (const n of state.npcs) drawNpc(ctx, n, camera);
  drawCrows(ctx, state, camera);

  for (const player of state.players) {
    // A `null` slot is a soul this viewer cannot currently see, not a soul
    // that doesn't exist — see net/snapshot.ts. There is nothing to draw
    // for one, which is the entire point of it being null.
    if (!player || !player.alive) continue;
    const fill = SOUL_COLORS[player.id % SOUL_COLORS.length]!;
    dot(ctx, player.x, player.y, 8, fill, camera, player.pack.cloak > 0 ? "#8a6a4a" : undefined);
    if (player.id !== localId) {
      // Another soul gets its lineage over its head, because "who is that"
      // is the first question anyone asks when they see one.
      ctx.fillStyle = "#cfc7b0";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`#${player.lineage}`, toPx(player.x, camera.x) + TILE_PX / 2, toPx(player.y, camera.y) + TILE_PX / 2 - 12);
      ctx.textAlign = "left";
    }
    if (player.pack.sword > 0 || player.pack.copperSword > 0 || player.pack.spear > 0) {
      // A stick held out to one side — enough to tell at a glance whether
      // that soul is the sort that can fight back yet, a sword reads as the
      // same gesture in a colour that says it is no longer a stick, and
      // copper gets its own colour rather than borrowing iron's — a real
      // blade, just not the same one.
      ctx.strokeStyle = player.pack.sword > 0 ? "#d8d8e0" : player.pack.copperSword > 0 ? "#c87d4a" : "#c8b088";
      ctx.lineWidth = player.pack.sword > 0 ? 3 : player.pack.copperSword > 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(toPx(player.x, camera.x) + TILE_PX / 2 + 8, toPx(player.y, camera.y) + TILE_PX / 2 - 8);
      ctx.lineTo(toPx(player.x, camera.x) + TILE_PX / 2 + 16, toPx(player.y, camera.y) + TILE_PX / 2 + 6);
      ctx.stroke();
    }
  }

  // `null` means he is nowhere near enough to see (net/snapshot.ts) — the
  // one thing a camera alone could never have hidden, since the old code
  // simply drew him wherever he was, anywhere on the map, every frame.
  if (state.lieutenant) {
    dot(ctx, state.lieutenant.x, state.lieutenant.y, 9, state.lieutenant.state === "hunt" ? "#c02020" : "#802020", camera);
  }
}

export function drawNight(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number): void {
  if (isNight(tick)) {
    ctx.fillStyle = "rgba(5, 10, 30, 0.45)";
    ctx.fillRect(0, 0, w, h);
  }
}

// ============================================================================
// HUD chrome — overlays drawn on top of the viewport, not a strip below it.
// ============================================================================

/** A path for a rounded rectangle. Canvas has `roundRect` natively in modern
 * browsers, but this keeps the drawing code independent of that and reads
 * the same everywhere it's used below. */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 10): void {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = "rgba(12, 12, 14, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A slim bar with a colour fill, no border, no baked-in label — the shared shape every gauge in this file uses. */
function slimBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string): void {
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fill();
  if (frac > 0) {
    roundRectPath(ctx, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/**
 * The four vitals' icons are shape-distinct as well as colour-distinct —
 * satiety a circle, hydration a diamond, warmth a square, health a
 * triangle — so the cluster still reads under red/green colour-blindness,
 * which four same-shaped coloured bars never could.
 */
function iconCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
function iconDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}
function iconSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  roundRectPath(ctx, cx - r, cy - r, r * 2, r * 2, 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function iconTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy + r * 0.85);
  ctx.lineTo(cx - r, cy + r * 0.85);
  ctx.closePath();
  ctx.fill();
}

const VITALS: ReadonlyArray<{
  icon: typeof iconCircle;
  color: string;
  get: (p: Player) => number;
  max: number;
}> = [
  { icon: iconCircle, color: "#e0a020", get: (p) => p.needs.satiety, max: NEED_MAX },
  { icon: iconDiamond, color: "#4a90c0", get: (p) => p.needs.hydration, max: NEED_MAX },
  { icon: iconSquare, color: "#d9772e", get: (p) => p.needs.warmth, max: NEED_MAX },
  { icon: iconTriangle, color: "#c02020", get: (p) => p.health, max: HEALTH_MAX },
];

const VITALS_X = 12;
const VITALS_Y = 12;
const VITALS_W = 172;

/** Top-left overlay: satiety/hydration/warmth/health as an icon+bar cluster instead of four full-width text bars. */
function drawVitals(ctx: CanvasRenderingContext2D, p: Player): void {
  const rowH = 16;
  const pad = 10;
  const h = pad * 2 + VITALS.length * rowH + (VITALS.length - 1) * 2;
  panel(ctx, VITALS_X, VITALS_Y, VITALS_W, h);

  VITALS.forEach((v, i) => {
    const rowY = VITALS_Y + pad + i * (rowH + 2) + rowH / 2;
    const iconX = VITALS_X + pad + 4;
    v.icon(ctx, iconX, rowY, 4.5, v.color);
    const barX = iconX + 12;
    const barW = VITALS_W - pad * 2 - 12 - 28;
    const frac = v.get(p) / v.max;
    slimBar(ctx, barX, rowY - 3, barW, 6, frac, v.color);
    ctx.fillStyle = "#cfc7b0";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(v.get(p))), VITALS_X + VITALS_W - pad, rowY + 3);
    ctx.textAlign = "left";
  });
}

/**
 * A colour and short label for how the road speaks of a soul (§2A — never
 * "reputation score" out loud). `null` at exactly zero: a soul who has
 * never killed or fed anyone shouldn't see a badge announcing "neutral,"
 * the same reasoning the old text line used.
 */
function standingBadge(p: Player): { label: string; color: string } | null {
  if (p.standing <= NOTORIOUS_STANDING) return { label: "his own now", color: "#8a7a5a" };
  if (p.standing < 0) return { label: `marked ${p.standing}`, color: "#c02020" };
  if (p.standing > 0) return { label: `standing +${p.standing}`, color: "#4caf50" };
  return null;
}

/** Top-left, under the vitals: a status pill (soul, day/night, unseen timer) plus a standing badge instead of a bracketed clause. */
function drawStatusChip(ctx: CanvasRenderingContext2D, state: ViewState, p: Player): void {
  const y = VITALS_Y + 12 + 4 * 18 + 10;
  const night = isNight(state.tick);
  const grace = p.graceUntil > state.tick ? `  unseen ${Math.ceil((p.graceUntil - state.tick) / 10)}s` : "";
  const text = `soul #${p.lineage} · ${night ? "night" : "day"}${p.atFire ? " · at fire" : ""}${grace}`;

  ctx.font = "10.5px 'IBM Plex Mono', monospace";
  const textW = ctx.measureText(text).width;
  const dotR = 3;
  const chipW = 10 + dotR * 2 + 6 + textW + 10;
  const chipH = 22;

  roundRectPath(ctx, VITALS_X, y, chipW, chipH, chipH / 2);
  ctx.fillStyle = "rgba(12, 12, 14, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.stroke();

  ctx.fillStyle = night ? "#3a4a6a" : "#c8a83a";
  ctx.beginPath();
  ctx.arc(VITALS_X + 10 + dotR, y + chipH / 2, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cfc7b0";
  ctx.fillText(text, VITALS_X + 10 + dotR * 2 + 6, y + chipH / 2 + 3.5);

  const badge = standingBadge(p);
  if (badge) {
    const bx = VITALS_X + chipW + 8;
    ctx.font = "10px 'IBM Plex Mono', monospace";
    const bw = ctx.measureText(badge.label).width + 16;
    roundRectPath(ctx, bx, y, bw, chipH, chipH / 2);
    ctx.fillStyle = `${badge.color}2e`;
    ctx.fill();
    ctx.strokeStyle = `${badge.color}80`;
    ctx.stroke();
    ctx.fillStyle = badge.color;
    ctx.textAlign = "center";
    ctx.fillText(badge.label, bx + bw / 2, y + chipH / 2 + 3.5);
    ctx.textAlign = "left";
  }
}

/**
 * Top-centre: noise gets its own gauge because it is the stat the whole
 * game is about, not one bar among five. Past ~80% of CROW_THRESHOLD the
 * screen edge pulses — "you are about to be seen" as a feeling, not just a
 * bar changing colour, which teaches the core mechanic faster than a
 * number ever does.
 */
function drawNoiseGauge(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number, noise: number, tick: number): void {
  const w = 190;
  const x = viewportW / 2 - w / 2;
  const y = 12;

  ctx.textAlign = "center";
  ctx.fillStyle = noise >= CROW_THRESHOLD ? "#e0a020" : "#c8b078";
  ctx.font = "600 9.5px 'IBM Plex Mono', monospace";
  ctx.fillText("NOISE", viewportW / 2, y + 8);

  const frac = noise / 1000;
  roundRectPath(ctx, x, y + 12, w, 7, 4);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#4caf50");
  grad.addColorStop(1, "#e0a020");
  roundRectPath(ctx, x, y + 12, Math.max(7, w * clamp(frac, 0, 1)), 7, 4);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.textAlign = "left";

  // The vignette: only once noise is close enough that it matters, so it
  // isn't background noise (so to speak) for the entire early game.
  const alarmFrac = (noise - CROW_THRESHOLD * 0.8) / (1000 - CROW_THRESHOLD * 0.8);
  if (alarmFrac > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(tick / 8);
    const strength = clamp(alarmFrac, 0, 1) * (0.12 + 0.14 * pulse);
    const g = ctx.createRadialGradient(
      viewportW / 2,
      viewportH / 2,
      viewportH * 0.35,
      viewportW / 2,
      viewportH / 2,
      viewportH * 0.75,
    );
    g.addColorStop(0, "rgba(224, 60, 60, 0)");
    g.addColorStop(1, `rgba(224, 60, 60, ${strength.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewportW, viewportH);
  }
}

/** A muted colour for terrain that isn't open ground — the minimap's only job is "can I walk there," not "what is it." */
function minimapColor(t: Tile): string {
  if (t === Tile.Water) return "#2a4a6a";
  // A road is the one terrain feature worth marking distinctly here — the
  // whole reason it exists is to be findable across a map this size.
  if (t === Tile.Road) return "#8a7a5e";
  if (t === Tile.Marsh) return "#28321f";
  if (isSolid(t)) return "#241f1a";
  return "#3a5a34";
}

const MINIMAP_W = 140;
const MINIMAP_MARGIN = 10;

/**
 * A terrain silhouette of the whole Verge, inset in the corner of the game
 * view — the thing a camera this much smaller than the map actually needs,
 * or a soul just wanders in circles nine times more of the time. It draws
 * only terrain, lit fires, and the souls this viewer already knows about
 * (whatever `players` still holds after fogging); nothing here ever reveals
 * a creature or the Lieutenant, because a "radar" would undo the entire
 * point of net/snapshot.ts filtering them out in the first place. Fires are
 * drawn because they already are global, unfogged data (a soul's own camp
 * is no secret) — this just makes that fact readable on a map nine times
 * the original size, not a new leak.
 */
export function drawMinimap(ctx: CanvasRenderingContext2D, world: World, players: ReadonlyArray<Player | null>, localId: number, canvasW: number): void {
  const h = Math.round(MINIMAP_W * (WORLD_H / WORLD_W));
  const x0 = canvasW - MINIMAP_W - MINIMAP_MARGIN;
  const y0 = MINIMAP_MARGIN;
  const cellW = MINIMAP_W / WORLD_W;
  const cellH = h / WORLD_H;

  panel(ctx, x0 - 4, y0 - 4, MINIMAP_W + 8, h + 8, 8);

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      ctx.fillStyle = minimapColor(world.get(x, y));
      ctx.fillRect(x0 + x * cellW, y0 + y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
  }

  for (const [idx] of world.fires) {
    const fx = idx % WORLD_W;
    const fy = Math.floor(idx / WORLD_W);
    ctx.fillStyle = "#ffcc55";
    ctx.beginPath();
    ctx.arc(x0 + fx * cellW, y0 + fy * cellH, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of players) {
    if (!p || !p.alive) continue;
    const px = x0 + (p.x / TILE) * cellW;
    const py = y0 + (p.y / TILE) * cellH;
    ctx.fillStyle = p.id === localId ? "#e8e0c8" : "#88c0e8";
    ctx.beginPath();
    ctx.arc(px, py, p.id === localId ? 2.5 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(232, 224, 200, 0.35)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, x0, y0, MINIMAP_W, h, 4);
  ctx.stroke();
}

/** Which tools a soul is carrying, for the resource tray's hotbar row — name, remaining uses, and the max it started at, so a bar can be drawn instead of a bare number. */
const TOOL_SLOTS: ReadonlyArray<{ key: keyof Pack; label: string; max: number }> = [
  { key: "sword", label: "sword", max: 30 },
  { key: "copperSword", label: "cu-sword", max: 18 },
  { key: "spear", label: "spear", max: 12 },
  { key: "axe", label: "axe", max: 25 },
  { key: "knife", label: "knife", max: 20 },
  { key: "pot", label: "pot", max: 15 },
  { key: "boots", label: "boots", max: 300 },
  { key: "gloves", label: "gloves", max: 25 },
  { key: "fishingLine", label: "line", max: 25 },
];

const RESOURCE_CHIPS: ReadonlyArray<{ key: keyof Pack; color: string }> = [
  { key: "wood", color: "#9c7a4a" },
  { key: "stone", color: "#8a8a8a" },
  { key: "hide", color: "#a86868" },
];

/**
 * Bottom-left: a handful of the most-reached-for resources as small chips,
 * then a hotbar of whatever tools are currently held (name + a wear bar,
 * not a sentence to parse), then a trade-offer chip. The full pack and
 * skills live one Tab page over (drawPanel) — this tray is a glance, not
 * an inventory screen.
 */
function drawResourceTray(ctx: CanvasRenderingContext2D, viewportH: number, p: Player): void {
  const pack = p.pack;
  const held = TOOL_SLOTS.filter((t) => (pack[t.key] as number) > 0);
  const chipsW = RESOURCE_CHIPS.length * 34;
  const hotbarW = held.length > 0 ? held.length * 58 + 10 : 0;
  const w = 14 + chipsW + (hotbarW > 0 ? 10 + hotbarW : 0) + 10;
  const h = 34;
  const x = 12;
  const y = viewportH - h - 12;

  panel(ctx, x, y, w, h);

  let cx = x + 10;
  ctx.font = "11px 'IBM Plex Mono', monospace";
  for (const chip of RESOURCE_CHIPS) {
    iconSquare(ctx, cx + 4, y + h / 2, 4, chip.color);
    ctx.fillStyle = "#e8e0c8";
    ctx.fillText(String(pack[chip.key]), cx + 12, y + h / 2 + 4);
    cx += 34;
  }

  if (held.length > 0) {
    cx += 4;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(cx, y + 6);
    ctx.lineTo(cx, y + h - 6);
    ctx.stroke();
    cx += 10;
    ctx.font = "9.5px 'IBM Plex Mono', monospace";
    for (const slot of held) {
      const uses = pack[slot.key] as number;
      ctx.fillStyle = "#d8cfb8";
      ctx.fillText(slot.label, cx, y + 13);
      slimBar(ctx, cx, y + 18, 50, 4, uses / slot.max, "#c8b088");
      cx += 58;
    }
  }
}

/** Bottom-left, above the resource tray: what you're currently offering to trade — buried in a sentence before, now a small chip both people can actually see. */
function drawOfferChip(ctx: CanvasRenderingContext2D, viewportH: number, offer: string): void {
  const y = viewportH - 12 - 34 - 8 - 22;
  ctx.font = "11px 'IBM Plex Mono', monospace";
  const w = ctx.measureText(`offering: ${offer}`).width + 20;
  roundRectPath(ctx, 12, y, w, 22, 11);
  ctx.fillStyle = "rgba(12, 12, 14, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();
  ctx.fillStyle = "#c8bfa8";
  ctx.fillText(`offering: ${offer}`, 22, y + 15);
}

/** Roughly tick.ts's own TALK_RADIUS — not exported, so this is a UI approximation of "close enough to talk," the same way the crafting cards approximate affordability without importing private recipe constants. */
const NEARBY_UNITS = TILE * 1.5;

/** Whichever one or two things are actually useful to do right now, computed from live state rather than a fixed list — the always-on bar shows verbs, not a keybinding dump. */
function usableActions(state: ViewState, p: Player): Array<{ key: string; label: string }> {
  if (p.talkingTo !== null) return [{ key: "H", label: "Leave" }, { key: "1-9", label: "Reply" }];
  const actions: Array<{ key: string; label: string }> = [];
  if (p.atFire) actions.push({ key: "F", label: "Feed fire" });
  else if (p.pack.wood >= 5) actions.push({ key: "F", label: "Build fire" });
  if (p.pack.cookedMeat > 0 || p.pack.fish > 0 || p.pack.rawMeat > 0) actions.push({ key: "4", label: "Eat" });
  const nearTalkable = state.npcs.some((n) => n.alive && (n.x - p.x) ** 2 + (n.y - p.y) ** 2 <= NEARBY_UNITS * NEARBY_UNITS);
  if (actions.length < 2 && nearTalkable) actions.push({ key: "H", label: "Talk" });
  if (actions.length < 2) {
    // Same approximation NEARBY_UNITS already is for TALK_RADIUS — tick.ts's
    // TEACH_MIN_LEVEL (2) isn't exported either, so it's repeated here.
    const student = state.players.find(
      (o): o is Player => !!o && o.id !== p.id && o.alive && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= NEARBY_UNITS * NEARBY_UNITS,
    );
    if (student) {
      const skill = bestSkill(p.skills);
      const teacherLevel = level(p.skills[skill]);
      if (teacherLevel >= 2 && student.skills[skill] < teachingCeiling(teacherLevel)) actions.push({ key: "K", label: "Teach" });
    }
  }
  return actions.slice(0, 2);
}

/** Bottom-centre: 1-2 keycap-style hints for whatever is actually usable, not a memorised list. */
function drawActionBar(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number, state: ViewState, p: Player): void {
  const actions = usableActions(state, p);
  if (actions.length === 0) return;
  let totalW = 0;
  ctx.font = "11.5px 'Inter', sans-serif";
  const widths = actions.map((a) => {
    const kw = a.key.length > 1 ? 30 : 18;
    const lw = ctx.measureText(a.label).width;
    return kw + 6 + lw + 20;
  });
  totalW = widths.reduce((s, w) => s + w, 0) + (actions.length - 1) * 8;
  let x = viewportW / 2 - totalW / 2;
  const y = viewportH - 34;

  actions.forEach((a, i) => {
    const w = widths[i]!;
    roundRectPath(ctx, x, y, w, 26, 8);
    ctx.fillStyle = "rgba(12, 12, 14, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.stroke();
    const kw = a.key.length > 1 ? 30 : 18;
    roundRectPath(ctx, x + 6, y + 4, kw, 18, 4);
    ctx.fillStyle = "#26262a";
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.stroke();
    ctx.fillStyle = "#e8e0c8";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(a.key, x + 6 + kw / 2, y + 16);
    ctx.textAlign = "left";
    ctx.fillStyle = "#d8cfb8";
    ctx.font = "11.5px 'Inter', sans-serif";
    ctx.fillText(a.label, x + 6 + kw + 6, y + 17);
    x += w + 8;
  });
}

/** Bottom-right: how to reach the crafting/reference panel, and which page it's on once open. */
export function drawTabHint(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number, page: number): void {
  const label = page <= 0 ? "Crafting & controls" : PANEL_PAGES[page - 1]!;
  ctx.font = "10.5px 'Inter', sans-serif";
  const w = 34 + ctx.measureText(label).width + 16;
  const x = viewportW - w - 12;
  const y = viewportH - 34;
  roundRectPath(ctx, x, y, w, 24, 12);
  ctx.fillStyle = "rgba(12, 12, 14, 0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.stroke();
  roundRectPath(ctx, x + 6, y + 4, 22, 16, 4);
  ctx.fillStyle = "#26262a";
  ctx.fill();
  ctx.strokeStyle = "#444";
  ctx.stroke();
  ctx.fillStyle = "#e8e0c8";
  ctx.font = "9px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("Tab", x + 17, y + 15);
  ctx.textAlign = "left";
  ctx.fillStyle = "#a89e8a";
  ctx.font = "10.5px 'Inter', sans-serif";
  ctx.fillText(label, x + 34, y + 16);
}

/** One narration line with when it arrived, so it can fade instead of being silently overwritten. */
export interface Toast {
  text: string;
  bornAtMs: number;
}

const TOAST_HOLD_MS = 4200;
const TOAST_FADE_MS = 1400;
const TOAST_LIFETIME_MS = TOAST_HOLD_MS + TOAST_FADE_MS;

/**
 * Narration used to be two permanent lines at the bottom of a text-block
 * HUD; now it's a small stack of toasts that queue and fade rather than
 * overwrite each other, so a fast second event doesn't erase the first one
 * before it's been read. `toasts` is owned by the caller (main.ts) — this
 * only draws whatever hasn't expired yet.
 */
export function drawToasts(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number, toasts: readonly Toast[], nowMs: number): void {
  const visible = toasts.filter((t) => nowMs - t.bornAtMs < TOAST_LIFETIME_MS).slice(-3);
  let y = viewportH - 60;
  for (let i = visible.length - 1; i >= 0; i--) {
    const t = visible[i]!;
    const age = nowMs - t.bornAtMs;
    const opacity = age < TOAST_HOLD_MS ? 1 : clamp(1 - (age - TOAST_HOLD_MS) / TOAST_FADE_MS, 0, 1);
    ctx.font = "11.5px 'Inter', sans-serif";
    const maxW = Math.min(440, viewportW - 80);
    const words = t.text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW - 28) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const boxH = 10 + lines.length * 15;
    const boxW = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28);
    const boxX = viewportW / 2 - boxW / 2;
    const boxY = y - boxH;

    roundRectPath(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fillStyle = `rgba(20, 14, 10, ${(0.85 * opacity).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(216, 184, 120, ${(0.35 * opacity).toFixed(3)})`;
    ctx.stroke();
    ctx.fillStyle = `rgba(224, 201, 160, ${opacity.toFixed(3)})`;
    ctx.textAlign = "center";
    lines.forEach((l, li) => ctx.fillText(l, viewportW / 2, boxY + 17 + li * 15));
    ctx.textAlign = "left";

    y = boxY - 6;
  }
}

// ============================================================================
// The Tab panel — crafting, pack & skills, the Barrow-list, and field notes.
// Reference/browsing only: every key still does exactly what it always did,
// open or closed, so this never has to intercept input the way a
// conversation does (see doDialogueChoice, tick.ts).
// ============================================================================

export const PANEL_PAGES = ["Crafting", "Pack & Skills", "Barrow-list", "Field notes"] as const;

interface Recipe {
  name: string;
  key: string;
  cost: string;
  effect: string;
  afford: (pack: Pack) => boolean;
}

const RECIPES: readonly Recipe[] = [
  { name: "Spear", key: "1", cost: "3 wood", effect: "12 hits · 3 dmg", afford: (p) => p.spear === 0 && p.wood >= 3 },
  { name: "Knife", key: "5", cost: "1 stone 1 wood", effect: "20 uses · butchering", afford: (p) => p.knife === 0 && p.stone >= 1 && p.wood >= 1 },
  { name: "Axe", key: "6", cost: "2 stone 1 wood", effect: "25 chops · quieter", afford: (p) => p.axe === 0 && p.stone >= 2 && p.wood >= 1 },
  { name: "Cordage", key: "7", cost: "1 hide, needs knife", effect: "2 cord", afford: (p) => p.knife > 0 && p.hide >= 1 },
  { name: "Snare", key: "8", cost: "2 cord 1 wood", effect: "sets on 2nd press", afford: (p) => p.snare > 0 || (p.cordage >= 2 && p.wood >= 1) },
  { name: "Cloak", key: "3", cost: "2 hide, at fire", effect: "halves the cold", afford: (p) => p.cloak === 0 && p.hide >= 2 },
  { name: "Boots", key: "O", cost: "2 hide 1 cord", effect: "softer marsh", afford: (p) => p.boots === 0 && p.hide >= 2 && p.cordage >= 1 },
  { name: "Gloves", key: "V", cost: "2 hide 1 cord", effect: "quieter dig", afford: (p) => p.gloves === 0 && p.hide >= 2 && p.cordage >= 1 },
  { name: "Charcoal", key: "9", cost: "3 wood, at fire", effect: "burns hotter", afford: (p) => p.wood >= 3 },
  { name: "Smelt", key: "0", cost: "2 ore 1 char, or 3 copper, or 1 crown", effect: "a bar, at fire", afford: (p) => (p.ore >= 2 && p.charcoal >= 1) || p.copper >= 3 || p.crowns >= 1 },
  { name: "Sword", key: "B", cost: "2 bar 1 wood 1 cord", effect: "6 dmg · 30 hits", afford: (p) => p.sword === 0 && p.bar >= 2 && p.wood >= 1 && p.cordage >= 1 },
  { name: "Copper sword", key: "B", cost: "2 copper bar 1 wood 1 cord", effect: "4 dmg · 18 hits", afford: (p) => p.copperSword === 0 && p.copperBar >= 2 && p.wood >= 1 && p.cordage >= 1 },
  { name: "Pot", key: "P", cost: "3 clay, at fire", effect: "heartier meals", afford: (p) => p.pot === 0 && p.clay >= 3 },
  { name: "Fishing line", key: "L", cost: "2 cord 1 wood", effect: "no fire needed", afford: (p) => p.fishingLine === 0 && p.cordage >= 2 && p.wood >= 1 },
];

function drawRecipeCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: Recipe, pack: Pack): void {
  const can = r.afford(pack);
  ctx.globalAlpha = can ? 1 : 0.4;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = "#1c1b18";
  ctx.fill();
  ctx.strokeStyle = "#333";
  ctx.stroke();

  ctx.fillStyle = "#e8e0c8";
  ctx.font = "500 13px 'Inter', sans-serif";
  ctx.fillText(r.name, x + 10, y + 18);

  ctx.font = "10px 'IBM Plex Mono', monospace";
  const kw = ctx.measureText(r.key).width + 10;
  roundRectPath(ctx, x + w - kw - 8, y + 7, kw, 15, 4);
  ctx.fillStyle = "#2a2925";
  ctx.fill();
  ctx.fillStyle = "#cfc7b0";
  ctx.textAlign = "center";
  ctx.fillText(r.key, x + w - kw / 2 - 8, y + 17.5);
  ctx.textAlign = "left";

  ctx.fillStyle = "#9a9284";
  ctx.font = "10.5px 'Inter', sans-serif";
  ctx.fillText(r.cost, x + 10, y + 34);
  ctx.fillText(r.effect, x + 10, y + 48);
  ctx.globalAlpha = 1;
}

function drawCraftingPage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, pack: Pack): void {
  const cols = 3;
  const gap = 10;
  const cardW = (w - gap * (cols - 1)) / cols;
  const cardH = 58;
  RECIPES.forEach((r, i) => {
    const cx = x + (i % cols) * (cardW + gap);
    const cy = y + Math.floor(i / cols) * (cardH + gap);
    drawRecipeCard(ctx, cx, cy, cardW, cardH, r, pack);
  });
  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Greyed out = missing ingredients or one already in hand. Keys still work with this page closed.", x + w / 2, y + Math.ceil(RECIPES.length / cols) * (cardH + gap) + 14);
  ctx.textAlign = "left";
}

const PACK_MATERIALS: ReadonlyArray<{ key: keyof Pack; label: string; color: string }> = [
  { key: "wood", label: "wood", color: "#9c7a4a" },
  { key: "stone", label: "stone", color: "#8a8a8a" },
  { key: "ore", label: "ore", color: "#c9a227" },
  { key: "copper", label: "copper", color: "#4a9a7a" },
  { key: "hide", label: "hide", color: "#a86868" },
  { key: "cordage", label: "cord", color: "#c8956a" },
  { key: "charcoal", label: "charcoal", color: "#3a3a38" },
  { key: "bar", label: "bar", color: "#b5a68c" },
  { key: "copperBar", label: "copper bar", color: "#c87d4a" },
  { key: "clay", label: "clay", color: "#9c6b42" },
  { key: "crowns", label: "crowns", color: "#e0c060" },
  { key: "glue", label: "glue", color: "#c8b878" },
  { key: "pitch", label: "pitch", color: "#4a3a2a" },
  { key: "rawMeat", label: "raw meat", color: "#8a4a3a" },
  { key: "cookedMeat", label: "cooked", color: "#c87d4a" },
  { key: "fish", label: "fish", color: "#8ba8c0" },
];

function drawPackPage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, p: Player): void {
  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillText("Materials", x, y);
  const cols = 4;
  const gap = 8;
  const cardW = (w - gap * (cols - 1)) / cols;
  const held = PACK_MATERIALS.filter((m) => (p.pack[m.key] as number) > 0);
  const shown = held.length > 0 ? held : PACK_MATERIALS.slice(0, 4);
  shown.forEach((m, i) => {
    const cx = x + (i % cols) * (cardW + gap);
    const cy = y + 10 + Math.floor(i / cols) * 30;
    roundRectPath(ctx, cx, cy, cardW, 24, 6);
    ctx.fillStyle = "#1c1b18";
    ctx.fill();
    ctx.strokeStyle = "#2e2c28";
    ctx.stroke();
    iconSquare(ctx, cx + 12, cy + 12, 4, m.color);
    ctx.fillStyle = "#e8e0c8";
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillText(m.label, cx + 20, cy + 15);
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#9a9284";
    ctx.textAlign = "right";
    ctx.fillText(String(p.pack[m.key]), cx + cardW - 8, cy + 15);
    ctx.textAlign = "left";
  });

  const skillsY = y + 10 + Math.ceil(shown.length / cols) * 30 + 20;
  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillText("Skills — dies with the soul; every hour spent is what separates two players", x, skillsY);
  const skillCols = 2;
  const skillW = (w - 16) / skillCols;
  SKILLS.forEach((sk: Skill, i) => {
    const cx = x + (i % skillCols) * skillW;
    const cy = skillsY + 14 + Math.floor(i / skillCols) * 20;
    ctx.fillStyle = "#c8bfa8";
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillText(sk, cx, cy + 10);
    const barX = cx + 74;
    const lvl = level(p.skills[sk]);
    slimBar(ctx, barX, cy + 4, skillW - 74 - 24, 6, lvl / 9, "#8a9a6a");
    ctx.fillStyle = "#6f6a5e";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.fillText(String(lvl), barX + (skillW - 74 - 24) + 6, cy + 10);
  });
}

function drawBarrowPage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, barrowList: readonly DeathEvent[]): void {
  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillText('"The truest tutorial in the game" — a village\'s own dead, readable any time.', x, y);
  const recent = barrowList.slice(-10).reverse();
  if (recent.length === 0) {
    ctx.fillStyle = "#5f5b52";
    ctx.fillText("No one has died here yet.", x, y + 26);
    return;
  }
  recent.forEach((entry, i) => {
    const ry = y + 20 + i * 22;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, ry + 8);
    ctx.lineTo(x + w, ry + 8);
    ctx.stroke();
    ctx.fillStyle = "#e8e0c8";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillText(`#${entry.lineage}`, x, ry + 4);
    ctx.fillStyle = entry.cause === "killed by another soul" ? "#c26a6a" : "#9a9284";
    ctx.fillText(entry.cause + (entry.mastery ? ` — was ${entry.mastery}` : ""), x + 60, ry + 4);
    ctx.fillStyle = "#6f6a5e";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${(entry.tick / 10).toFixed(0)}s`, x + w, ry + 4);
    ctx.textAlign = "left";
  });
}

const TERRAIN_LEGEND: ReadonlyArray<[string, Tile]> = [
  ["Grass", Tile.Grass],
  ["Tree", Tile.Tree],
  ["Water", Tile.Water],
  ["Bush", Tile.Bush],
  ["Rock", Tile.Rock],
  ["Ore", Tile.Ore],
  ["Copper", Tile.Copper],
  ["Marsh", Tile.Marsh],
  ["Road", Tile.Road],
  ["Ruin", Tile.Ruin],
  ["Clay", Tile.Clay],
  ["Meadow", Tile.Meadow],
  ["Thicket", Tile.Thicket],
  ["House", Tile.House],
];

const BESTIARY: ReadonlyArray<{ kind: CreatureKind; note: string }> = [
  { kind: "hare", note: "outruns you — needs a snare" },
  { kind: "deer", note: "the ordinary hunt" },
  { kind: "river-goat", note: "slow, calm, worth the most" },
  { kind: "hedge-boar", note: "faster than you, ignores you until struck" },
  { kind: "wolf", note: "comes looking, worse after dark" },
];

/** Terrain legend, a bestiary reference, and who's in the village — static reference, none of it a live build target, all of it already true in code. */
function drawFieldNotesPage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, state: ViewState): void {
  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.fillText("Terrain", x, y);
  const legendCols = 4;
  const legendW = (w - 30) / legendCols;
  TERRAIN_LEGEND.forEach(([name, t], i) => {
    const cx = x + (i % legendCols) * legendW;
    const cy = y + 16 + Math.floor(i / legendCols) * 18;
    roundRectPath(ctx, cx, cy - 9, 12, 12, 3);
    ctx.fillStyle = COLORS[t];
    ctx.fill();
    ctx.fillStyle = "#c8bfa8";
    ctx.font = "10.5px 'Inter', sans-serif";
    ctx.fillText(name, cx + 18, cy + 1);
  });

  const bestiaryY = y + 16 + Math.ceil(TERRAIN_LEGEND.length / legendCols) * 18 + 16;
  ctx.fillStyle = "#7a7568";
  ctx.fillText("Bestiary", x, bestiaryY);
  BESTIARY.forEach((b, i) => {
    const by = bestiaryY + 16 + i * 16;
    const stats = STATS[b.kind];
    ctx.fillStyle = "#e8e0c8";
    ctx.font = "10.5px 'Inter', sans-serif";
    ctx.fillText(b.kind, x, by);
    ctx.fillStyle = "#9a9284";
    ctx.fillText(`${stats.meat} meat${stats.hide ? `, ${stats.hide} hide` : ""}`, x + 100, by);
    ctx.fillStyle = "#8a8278";
    ctx.fillText(b.note, x + 220, by);
  });

  const villagersY = bestiaryY + 16 + BESTIARY.length * 16 + 16;
  ctx.fillStyle = "#7a7568";
  ctx.fillText("In the village", x, villagersY);
  state.npcs.forEach((n, i) => {
    const ny = villagersY + 16 + i * 16;
    ctx.fillStyle = n.role === "teacher" ? "#d8b878" : "#c8bfa8";
    ctx.font = "10.5px 'Inter', sans-serif";
    ctx.fillText(n.name, x, ny);
    ctx.fillStyle = n.alive ? "#6f6a5e" : "#5f4a4a";
    ctx.fillText(n.alive ? (n.role === "teacher" ? "the first profession a new soul meets" : "") : "not seen for a while", x + 100, ny);
  });
}

/**
 * The crafting menu the "further notes" ask for: Tab cycles through this
 * panel's pages rather than opening a modal that swallows input — every
 * key still does exactly what it always did whether this is open or
 * closed, so browsing the recipes never costs you the fire you're standing
 * next to.
 */
export function drawPanel(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number, page: number, p: Player, state: ViewState, barrowList: readonly DeathEvent[]): void {
  if (page <= 0 || page > PANEL_PAGES.length) return;
  const x = 40;
  const y = 30;
  const w = viewportW - 80;
  const h = viewportH - 60;

  ctx.fillStyle = "rgba(6, 6, 6, 0.6)";
  ctx.fillRect(0, 0, viewportW, viewportH);
  roundRectPath(ctx, x, y, w, h, 14);
  ctx.fillStyle = "rgba(16, 15, 13, 0.97)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.stroke();

  const padX = x + 22;
  const padY = y + 20;

  ctx.fillStyle = "#f2ead2";
  ctx.font = "600 15px 'Inter', sans-serif";
  ctx.fillText(PANEL_PAGES[page - 1]!, padX, padY);

  ctx.font = "11px 'Inter', sans-serif";
  let tabX = x + w - 20;
  for (let i = PANEL_PAGES.length; i >= 1; i--) {
    const label = PANEL_PAGES[i - 1]!;
    const tw = ctx.measureText(label).width;
    tabX -= tw;
    ctx.fillStyle = i === page ? "#e0a020" : "#6f6a5e";
    ctx.fillText(label, tabX, padY - 2);
    tabX -= 16;
  }

  const contentY = padY + 26;
  const contentW = w - 44;
  if (page === 1) drawCraftingPage(ctx, padX, contentY, contentW, p.pack);
  else if (page === 2) drawPackPage(ctx, padX, contentY, contentW, p);
  else if (page === 3) drawBarrowPage(ctx, padX, contentY, contentW, barrowList);
  else if (page === 4) drawFieldNotesPage(ctx, padX, contentY, contentW, state);

  ctx.fillStyle = "#7a7568";
  ctx.font = "11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WASD move · SPACE strike · G give · Tab: next page / close", x + w / 2, y + h - 14);
  ctx.textAlign = "left";
}

/**
 * The conversation tree (dialogue.ts), drawn as a visual-novel-style panel
 * anchored at the bottom of the viewport. Only the node id travels the wire
 * (Player.dialogueNode) — the text itself is looked up here, from the same
 * static module the sim used to decide what a reply does, so nothing about
 * a conversation's content is ever sent twice or drifts between what the
 * sim meant and what the screen shows.
 */
export function drawDialogue(ctx: CanvasRenderingContext2D, state: ViewState, localId: number, viewportW: number, viewportH: number): void {
  const player = state.players[localId];
  if (!player || !player.alive || player.talkingTo === null || player.dialogueNode === null) return;
  const npc = state.npcs.find((n) => n.id === player.talkingTo);
  if (!npc) return;
  const node = DIALOGUE_TREES[npc.role]?.[player.dialogueNode];
  if (!node) return;

  const boxX = 24;
  const boxY = viewportH - 24 - 150;
  const boxW = viewportW - 48;
  const boxH = 150;
  const portraitColor = npc.role === "teacher" ? "#d8b878" : "#a89878";

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, viewportW, viewportH);

  roundRectPath(ctx, boxX, boxY, boxW, boxH, 12);
  ctx.fillStyle = "rgba(14, 13, 11, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(216, 184, 120, 0.3)";
  ctx.stroke();

  roundRectPath(ctx, boxX + 18, boxY + 18, 44, 44, 10);
  ctx.fillStyle = portraitColor;
  ctx.fill();

  const textX = boxX + 18 + 44 + 16;
  const textW = boxW - (18 + 44 + 16) - 20;

  ctx.textAlign = "left";
  ctx.fillStyle = portraitColor;
  ctx.font = "600 13px 'Inter', sans-serif";
  ctx.fillText(npc.name, textX, boxY + 30);

  ctx.fillStyle = "#e8e0c8";
  ctx.font = "13px 'Inter', sans-serif";
  const afterText = wrapText(ctx, node.text, textX, boxY + 50, textW, 17);

  const optionsY = Math.max(afterText + 6, boxY + boxH - 18 * Math.max(node.options.length, 1) - 12);
  if (node.options.length === 0) {
    ctx.fillStyle = "#9ab08a";
    ctx.font = "11.5px 'Inter', sans-serif";
    ctx.fillText("They have nothing more to say. [H to leave]", textX, boxY + boxH - 14);
  } else {
    node.options.forEach((opt, i) => {
      const oy = optionsY + i * 20;
      roundRectPath(ctx, textX, oy - 12, 16, 16, 4);
      ctx.fillStyle = "#26262a";
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.stroke();
      ctx.fillStyle = "#e8e0c8";
      ctx.font = "9.5px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), textX + 8, oy - 1);
      ctx.textAlign = "left";
      ctx.fillStyle = "#c8bfa8";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText(opt.label, textX + 24, oy);
    });
  }
}

/** Canvas has no word-wrap of its own; dialogue text is long enough to need one. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineHeight;
}

/** A rounded stat chip for the death screen — carried wood, beasts taken, seconds survived. */
function statChip(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, label: string): number {
  ctx.font = "15px 'IBM Plex Mono', monospace";
  const w = Math.max(60, ctx.measureText(value).width + 28);
  roundRectPath(ctx, x, y, w, 44, 8);
  ctx.fillStyle = "#1c1b18";
  ctx.fill();
  ctx.fillStyle = "#e8e0c8";
  ctx.textAlign = "center";
  ctx.fillText(value, x + w / 2, y + 22);
  ctx.font = "9.5px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#8a8278";
  ctx.fillText(label, x + w / 2, y + 36);
  ctx.textAlign = "left";
  return w;
}

export function drawDeathScreen(ctx: CanvasRenderingContext2D, w: number, h: number, o: DeathEvent, barrowList: readonly DeathEvent[]): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  const cardW = 480;
  const cardX = w / 2 - cardW / 2;
  const cardY = h / 2 - 220;
  roundRectPath(ctx, cardX, cardY, cardW, 440, 16);
  ctx.fillStyle = "rgba(16, 15, 13, 0.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#c02020";
  ctx.font = "600 11px 'Inter', sans-serif";
  ctx.fillText(`SOUL #${o.lineage} HAS FALLEN`, w / 2, cardY + 34);

  ctx.fillStyle = "#f2ead2";
  ctx.font = "600 22px 'Inter', sans-serif";
  const cause = o.cause.charAt(0).toUpperCase() + o.cause.slice(1);
  ctx.fillText(cause, w / 2, cardY + 66);

  const kills = o.kills ?? 0;
  const chips: Array<[string, string]> = [
    [String(o.wood), "WOOD"],
    [String(kills), "BEASTS"],
    [`${(o.tick / 10).toFixed(0)}s`, "SURVIVED"],
  ];
  const chipWs = chips.map(([v]) => {
    ctx.font = "15px 'IBM Plex Mono', monospace";
    return Math.max(60, ctx.measureText(v).width + 28);
  });
  const gap = 10;
  let cx = w / 2 - (chipWs.reduce((a, b) => a + b, 0) + gap * (chips.length - 1)) / 2;
  const chipY = cardY + 88;
  chips.forEach(([v, label], i) => {
    statChip(ctx, cx, chipY, v, label);
    cx += chipWs[i]! + gap;
  });

  if (o.mastery) {
    ctx.fillStyle = "#a89878";
    ctx.font = "italic 12.5px 'Inter', sans-serif";
    ctx.fillText(`They were ${o.mastery}. The next soul starts at nothing.`, w / 2, chipY + 70);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(cardX + 36, chipY + 90);
  ctx.lineTo(cardX + cardW - 36, chipY + 90);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#8a8278";
  ctx.font = "600 10px 'Inter', sans-serif";
  ctx.fillText("THE BARROW-LIST", cardX + 36, chipY + 112);
  const recent = barrowList.slice(-6).reverse();
  recent.forEach((entry, i) => {
    const ry = chipY + 132 + i * 20;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(cardX + 36, ry + 6);
    ctx.lineTo(cardX + cardW - 36, ry + 6);
    ctx.stroke();
    ctx.fillStyle = "#c8bfa8";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillText(`#${entry.lineage}`, cardX + 36, ry + 2);
    ctx.fillText(entry.cause, cardX + 36 + 50, ry + 2);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#6f6a5e";
  ctx.font = "11.5px 'IBM Plex Mono', monospace";
  ctx.fillText("Press any key to begin again, as the next soul.", w / 2, cardY + 420);
  ctx.textAlign = "left";
}

/**
 * Everything that used to be the text-block HUD, called together from
 * main.ts. Kept as one entry point so the frame loop's draw order reads as
 * one line instead of a dozen — the individual pieces above are still each
 * their own function because a few of them (drawDialogue, the panel, the
 * death screen) need to draw on top of everything else and are called
 * separately.
 */
export function drawHud(ctx: CanvasRenderingContext2D, state: ViewState, p: Player, viewportW: number, viewportH: number): void {
  drawVitals(ctx, p);
  drawStatusChip(ctx, state, p);
  drawNoiseGauge(ctx, viewportW, viewportH, state.noise, state.tick);
  drawOfferChip(ctx, viewportH, p.offer);
  drawResourceTray(ctx, viewportH, p);
  drawActionBar(ctx, viewportW, viewportH, state, p);
}
