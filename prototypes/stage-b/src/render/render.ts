/**
 * The renderer — the one place floats are allowed (doc/world/PLAN.md §43A).
 * It reads sim state and draws it; it never writes back into it.
 *
 * The Verge outgrew the screen (nine times its original footprint), so this
 * file now owns a camera: a `VIEW_W`x`VIEW_H`-tile window, centred on the
 * local soul and clamped to the map's edges, through which everything below
 * is drawn. Nothing upstream of here enforces the fog that makes that camera
 * meaningful rather than decorative — net/snapshot.ts already cut anything
 * too far away out of the data before it reached the wire — so this file's
 * job is only ever "where on screen," never "whether to show at all."
 */
import { TILE, clamp } from "../sim/fixed.js";
import { World, WORLD_W, WORLD_H, Tile, isSolid } from "../sim/world.js";
import { isNight, CROW_THRESHOLD, NOTORIOUS_STANDING, DeathEvent } from "../sim/tick.js";
import { Player, Lieutenant, NEED_MAX, HEALTH_MAX } from "../sim/entities.js";
import { Creature } from "../sim/creatures.js";
import { SKILLS, level } from "../sim/skills.js";

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

export function drawEntities(ctx: CanvasRenderingContext2D, state: ViewState, localId: number, camera: Camera): void {
  for (const c of state.creatures) drawCreature(ctx, c, camera);
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
    if (player.pack.sword > 0 || player.pack.spear > 0) {
      // A stick held out to one side — enough to tell at a glance whether
      // that soul is the sort that can fight back yet, and a sword reads as
      // the same gesture in a colour that says it is no longer a stick.
      ctx.strokeStyle = player.pack.sword > 0 ? "#d8d8e0" : "#c8b088";
      ctx.lineWidth = player.pack.sword > 0 ? 3 : 2;
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

/** A muted colour for terrain that isn't open ground — the minimap's only job is "can I walk there," not "what is it." */
function minimapColor(t: Tile): string {
  if (t === Tile.Water) return "#2a4a6a";
  if (isSolid(t)) return "#241f1a";
  return "#3a5a34";
}

const MINIMAP_W = 140;
const MINIMAP_MARGIN = 10;

/**
 * A terrain silhouette of the whole Verge, inset in the corner of the game
 * view — the thing a camera this much smaller than the map actually needs,
 * or a soul just wanders in circles nine times more of the time. It draws
 * only terrain and the souls this viewer already knows about (whatever
 * `state.players` still holds after fogging); nothing here ever reveals a
 * creature or the Lieutenant, because a "radar" would undo the entire point
 * of net/snapshot.ts filtering them out in the first place.
 */
export function drawMinimap(ctx: CanvasRenderingContext2D, world: World, players: ReadonlyArray<Player | null>, localId: number, canvasW: number): void {
  const h = Math.round(MINIMAP_W * (WORLD_H / WORLD_W));
  const x0 = canvasW - MINIMAP_W - MINIMAP_MARGIN;
  const y0 = MINIMAP_MARGIN;
  const cellW = MINIMAP_W / WORLD_W;
  const cellH = h / WORLD_H;

  ctx.fillStyle = "rgba(10, 10, 12, 0.6)";
  ctx.fillRect(x0 - 4, y0 - 4, MINIMAP_W + 8, h + 8);

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      ctx.fillStyle = minimapColor(world.get(x, y));
      ctx.fillRect(x0 + x * cellW, y0 + y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
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

  ctx.strokeStyle = "rgba(232, 224, 200, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, MINIMAP_W, h);
}

function barColor(frac: number): string {
  if (frac > 0.5) return "#4caf50";
  if (frac > 0.2) return "#e0a020";
  return "#c02020";
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, label: string): void {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = barColor(frac);
  ctx.fillRect(x, y, Math.max(0, w * frac), h);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "11px monospace";
  ctx.fillText(label, x + 4, y + h - 3);
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: ViewState,
  p: Player,
  hudY: number,
  hudW: number,
  hudH: number,
): void {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, hudY, hudW, hudH);

  const pack = p.pack;
  drawBar(ctx, 10, hudY + 8, 150, 16, p.needs.satiety / NEED_MAX, "satiety");
  drawBar(ctx, 170, hudY + 8, 150, 16, p.needs.hydration / NEED_MAX, "hydration");
  drawBar(ctx, 330, hudY + 8, 150, 16, p.needs.warmth / NEED_MAX, "warmth");
  drawBar(ctx, 490, hudY + 8, 150, 16, p.health / HEALTH_MAX, "health");

  // Noise gets its own readout because it is the stat the whole game is
  // about, and because past the crow threshold it stops being a number and
  // becomes birds.
  const noiseFrac = state.noise / 1000;
  drawBar(ctx, 650, hudY + 8, 108, 16, noiseFrac, state.noise >= CROW_THRESHOLD ? "noise!" : "noise");

  ctx.fillStyle = "#ccc";
  ctx.font = "12px monospace";
  // Tools show what is left in them, because "spear 2" is a decision and
  // "spear" is not.
  const kit = [
    pack.spear > 0 ? `spear ${pack.spear}` : null,
    pack.sword > 0 ? `sword ${pack.sword}` : null,
    pack.cloak > 0 ? `cloak ${pack.cloak}` : null,
    pack.knife > 0 ? `knife ${pack.knife}` : null,
    pack.axe > 0 ? `axe ${pack.axe}` : null,
    pack.snare > 0 ? `snare ${pack.snare}` : null,
    pack.fishingLine > 0 ? `line ${pack.fishingLine}` : null,
  ]
    .filter(Boolean)
    .join("  ");
  // Only counts souls this viewer can currently see — the same fog that
  // hides them from the screen hides them from this line too, on purpose.
  const others = state.players.filter((o): o is Player => o !== null && o.id !== p.id && o.alive).length;
  // A new soul is beneath the Grey King's notice for a few seconds. Say so,
  // or the player spends them running from nothing.
  const grace = p.graceUntil > state.tick ? `  [unseen ${Math.ceil((p.graceUntil - state.tick) / 10)}s]` : "";
  // How the road speaks of you (doc/world/PLAN.md §2A) — silent at zero, so
  // a soul who has never killed or fed anyone sees nothing here at all.
  const standing =
    p.standing <= NOTORIOUS_STANDING
      ? "  [his own now — the Lieutenant no longer hunts you]"
      : p.standing < 0
        ? `  [marked, standing ${p.standing}]`
        : p.standing > 0
          ? `  [standing +${p.standing}]`
          : "";
  ctx.fillText(
    `soul #${p.lineage}  ${isNight(state.tick) ? "night" : "day"}  kills ${p.kills}` +
      `${p.atFire ? "  [at fire]" : ""}${grace}${standing}${others > 0 ? `  ${others} other soul${others > 1 ? "s" : ""} nearby` : ""}`,
    10,
    hudY + 44,
  );
  ctx.fillText(
    `wood ${pack.wood}  stone ${pack.stone}  cord ${pack.cordage}  ` +
      `meat ${pack.rawMeat} raw / ${pack.cookedMeat} cooked  hide ${pack.hide}`,
    10,
    hudY + 60,
  );
  // The sword chain's materials and fish, kept off the line above so that
  // line still reads at a glance for a soul who never touches a vein or
  // a line.
  ctx.fillText(`ore ${pack.ore}  charcoal ${pack.charcoal}  bar ${pack.bar}  fish ${pack.fish}`, 10, hudY + 76);

  // Tools show what is left in them, because "axe 3" is a decision.
  ctx.fillStyle = "#c8b088";
  ctx.fillText(kit || "no tools", 10, hudY + 92);

  // Skill is the only thing that separates two souls, so it gets a line.
  const learned = SKILLS.map((sk) => `${sk.slice(0, 4)} ${level(p.skills[sk])}`).join("  ");
  ctx.fillStyle = "#9ab08a";
  ctx.fillText(learned, 10, hudY + 108);

  ctx.fillStyle = "#8a8a8a";
  ctx.fillText(
    "WASD move · E gather/chip/butcher · SPACE strike · F fire (5 wood) / feed (1)",
    10,
    hudY + 126,
  );
  ctx.fillText(
    "1 spear (3w) · 2 cook · 3 cloak (2 hide) · 4 eat · 5 knife (1s 1w) · 6 axe (2s 1w)",
    10,
    hudY + 140,
  );
  ctx.fillText(
    `7 cord (1 hide, needs knife) · 8 snare (2 cord 1w), again to set · T offer: ${p.offer} · G give`,
    10,
    hudY + 154,
  );
  ctx.fillText(
    "9 charcoal (3w, at fire) · 0 smelt (2 ore 1 char, at fire) · B sword (2 bar 1w 1 cord)",
    10,
    hudY + 168,
  );
  ctx.fillText(
    "L line (2 cord 1w) · C fish, at the water's edge — press again to keep casting",
    10,
    hudY + 182,
  );

  const logLines = state.log.slice(-2);
  ctx.fillStyle = "#d8c8a0";
  logLines.forEach((line, i) => ctx.fillText(line, 10, hudY + 200 + i * 15));
}

export function drawDeathScreen(ctx: CanvasRenderingContext2D, w: number, h: number, o: DeathEvent, barrowList: DeathEvent[]): void {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8e0c8";
  ctx.font = "20px serif";
  ctx.textAlign = "center";
  ctx.fillText(`Soul #${o.lineage} — ${o.cause}.`, w / 2, h / 2 - 40);
  ctx.font = "14px serif";
  const kills = o.kills ?? 0;
  const beasts = kills === 1 ? "1 beast" : `${kills} beasts`;
  ctx.fillText(`Carried ${o.wood} wood. Took ${beasts}. Survived ${(o.tick / 10).toFixed(0)}s.`, w / 2, h / 2 - 14);
  if (o.mastery) {
    ctx.fillStyle = "#a89878";
    ctx.fillText(`They were ${o.mastery}. The next soul starts at nothing.`, w / 2, h / 2 + 8);
    ctx.fillStyle = "#e8e0c8";
  }
  ctx.font = "13px monospace";
  ctx.fillText("Press any key to begin again, as the next soul.", w / 2, h / 2 + 36);

  ctx.font = "12px monospace";
  ctx.fillStyle = "#a89878";
  ctx.fillText("— the Barrow-list —", w / 2, h / 2 + 66);
  const recent = barrowList.slice(-6);
  recent.forEach((entry, i) => {
    ctx.fillText(`#${entry.lineage}: ${entry.cause}`, w / 2, h / 2 + 84 + i * 14);
  });
  ctx.textAlign = "left";
}
