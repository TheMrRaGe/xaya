/**
 * The renderer — the one place floats are allowed (§43A). It reads sim
 * state and draws it; it never writes back into it.
 */
import { TILE } from "../sim/fixed.js";
import { World, WORLD_W, WORLD_H, Tile } from "../sim/world.js";
import { SimState, isNight, CROW_THRESHOLD } from "../sim/tick.js";
import { NEED_MAX, HEALTH_MAX } from "../sim/entities.js";
import { Creature } from "../sim/creatures.js";
import { Obituary } from "../persist/lineage.js";

export const TILE_PX = 32;

const COLORS: Record<Tile, string> = {
  [Tile.Grass]: "#3a5a34",
  [Tile.Tree]: "#1f3d1a",
  [Tile.Stump]: "#5a4632",
  [Tile.Water]: "#2a4a6a",
  [Tile.Bush]: "#4a6a2a",
  [Tile.BareBush]: "#3a3a2a",
  [Tile.Campfire]: "#8a4a1a",
  [Tile.Ash]: "#2b2723",
};

/** Fuel at which a fire is drawn as embers rather than a blaze. */
const EMBER_FUEL = 200;

export function drawWorld(ctx: CanvasRenderingContext2D, world: World, tick: number): void {
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const t = world.get(x, y);
      ctx.fillStyle = COLORS[t];
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      if (t === Tile.Campfire) {
        // A fire that flickers is a fire you can find from across the map,
        // which is exactly the deal you took when you built it — and one
        // burning down to embers is a warning you can read without a HUD.
        const fuel = world.fuelAt(x, y);
        const life = Math.min(1, fuel / (EMBER_FUEL * 4));
        const flicker = 1.5 + life * 2.5 + Math.sin(tick / 3 + x + y) * (0.4 + life);
        ctx.fillStyle = fuel > EMBER_FUEL ? "#ffcc55" : "#b04a18";
        ctx.beginPath();
        ctx.arc(x * TILE_PX + TILE_PX / 2, y * TILE_PX + TILE_PX / 2, flicker, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function toPx(units: number): number {
  return (units / TILE) * TILE_PX;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(toPx(x) + TILE_PX / 2, toPx(y) + TILE_PX / 2, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature): void {
  if (c.state === "dead" && c.butchered) return;

  if (c.state === "dead") {
    // A carcass: worth walking back for, and worth nothing once it rots.
    const cx = toPx(c.x) + TILE_PX / 2;
    const cy = toPx(c.y) + TILE_PX / 2;
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
    dot(ctx, c.x, c.y, 7, c.state === "flee" ? "#e6d2a8" : "#c8a878");
  } else {
    dot(ctx, c.x, c.y, 9, "#6b4a2a", c.state === "charge" ? "#c02020" : undefined);
  }
}

/**
 * The crows. They gather over whatever was last loud and drift after it,
 * and the Lieutenant walks toward them — so this is not decoration, it is
 * the detection channel, drawn where the player can read it.
 */
function drawCrows(ctx: CanvasRenderingContext2D, state: SimState): void {
  if (state.noise < CROW_THRESHOLD) return;
  const strength = Math.min(1, (state.noise - CROW_THRESHOLD) / (1000 - CROW_THRESHOLD));
  const count = 3 + Math.round(strength * 4);
  const cx = toPx(state.crowX) + TILE_PX / 2;
  const cy = toPx(state.crowY) + TILE_PX / 2;
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

export function drawEntities(ctx: CanvasRenderingContext2D, state: SimState): void {
  const { player, lieutenant } = state;

  for (const c of state.creatures) drawCreature(ctx, c);
  drawCrows(ctx, state);

  if (player.alive) {
    dot(ctx, player.x, player.y, 8, "#e8e0c8", player.pack.cloak > 0 ? "#8a6a4a" : undefined);
    if (player.pack.spear > 0) {
      // A stick held out to one side — enough to tell at a glance whether
      // you are the sort of soul that can fight back yet.
      ctx.strokeStyle = "#c8b088";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toPx(player.x) + TILE_PX / 2 + 8, toPx(player.y) + TILE_PX / 2 - 8);
      ctx.lineTo(toPx(player.x) + TILE_PX / 2 + 16, toPx(player.y) + TILE_PX / 2 + 6);
      ctx.stroke();
    }
  }

  dot(ctx, lieutenant.x, lieutenant.y, 9, lieutenant.state === "hunt" ? "#c02020" : "#802020");
}

export function drawNight(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number): void {
  if (isNight(tick)) {
    ctx.fillStyle = "rgba(5, 10, 30, 0.45)";
    ctx.fillRect(0, 0, w, h);
  }
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

export function drawHud(ctx: CanvasRenderingContext2D, state: SimState, hudY: number, hudW: number, hudH: number): void {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, hudY, hudW, hudH);

  const p = state.player;
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
  const kit = [pack.spear > 0 ? `spear ${pack.spear}` : null, pack.cloak > 0 ? `cloak ${pack.cloak}` : null]
    .filter(Boolean)
    .join("  ");
  ctx.fillText(
    `soul #${p.lineage}  ${isNight(state.tick) ? "night" : "day"}  kills ${p.kills}${state.atFire ? "  [at fire]" : ""}`,
    10,
    hudY + 44,
  );
  ctx.fillText(
    `wood ${pack.wood}  meat ${pack.rawMeat} raw / ${pack.cookedMeat} cooked  hide ${pack.hide}  ${kit}`,
    10,
    hudY + 60,
  );

  ctx.fillStyle = "#8a8a8a";
  ctx.fillText("WASD move · E gather/butcher · SPACE strike · F build fire (5 wood) / feed it (1)", 10, hudY + 78);
  ctx.fillText("1 spear (3 wood) · 2 cook (at fire) · 3 cloak (2 hide, at fire) · 4 eat", 10, hudY + 92);

  const logLines = state.log.slice(-2);
  ctx.fillStyle = "#d8c8a0";
  logLines.forEach((line, i) => ctx.fillText(line, 10, hudY + 114 + i * 15));
}

export function drawDeathScreen(ctx: CanvasRenderingContext2D, w: number, h: number, o: Obituary, barrowList: Obituary[]): void {
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
  ctx.font = "13px monospace";
  ctx.fillText("Press any key to begin again, as the next soul.", w / 2, h / 2 + 20);

  ctx.font = "12px monospace";
  ctx.fillStyle = "#a89878";
  ctx.fillText("— the Barrow-list —", w / 2, h / 2 + 50);
  const recent = barrowList.slice(-6);
  recent.forEach((entry, i) => {
    ctx.fillText(`#${entry.lineage}: ${entry.cause}`, w / 2, h / 2 + 68 + i * 14);
  });
  ctx.textAlign = "left";
}
