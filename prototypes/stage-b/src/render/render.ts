/**
 * The renderer — the one place floats are allowed (doc/world/PLAN.md §43A).
 * It reads sim state and draws it; it never writes back into it.
 */
import { TILE } from "../sim/fixed.js";
import { World, Tile } from "../sim/world.js";
import { SimState, isNight } from "../sim/tick.js";
import { NEED_MAX, HEALTH_MAX } from "../sim/entities.js";
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
};

export function drawWorld(ctx: CanvasRenderingContext2D, world: World): void {
  for (let y = 0; y < world.tiles.length / 24; y++) {
    for (let x = 0; x < 24; x++) {
      const t = world.get(x, y);
      ctx.fillStyle = COLORS[t];
      ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      if (t === Tile.Campfire) {
        ctx.fillStyle = "#ffcc55";
        ctx.beginPath();
        ctx.arc(x * TILE_PX + TILE_PX / 2, y * TILE_PX + TILE_PX / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function toPx(units: number): number {
  return (units / TILE) * TILE_PX;
}

export function drawEntities(ctx: CanvasRenderingContext2D, state: SimState): void {
  const { player, lieutenant } = state;

  if (player.alive) {
    ctx.fillStyle = "#e8e0c8";
    ctx.beginPath();
    ctx.arc(toPx(player.x) + TILE_PX / 2, toPx(player.y) + TILE_PX / 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = lieutenant.state === "hunt" ? "#c02020" : "#802020";
  ctx.beginPath();
  ctx.arc(toPx(lieutenant.x) + TILE_PX / 2, toPx(lieutenant.y) + TILE_PX / 2, 9, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "11px monospace";
  ctx.fillText(label, x + 4, y + h - 3);
}

export function drawHud(ctx: CanvasRenderingContext2D, state: SimState, hudY: number, hudW: number, hudH: number): void {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, hudY, hudW, hudH);

  const p = state.player;
  drawBar(ctx, 10, hudY + 8, 150, 16, p.needs.satiety / NEED_MAX, "satiety");
  drawBar(ctx, 170, hudY + 8, 150, 16, p.needs.hydration / NEED_MAX, "hydration");
  drawBar(ctx, 330, hudY + 8, 150, 16, p.needs.warmth / NEED_MAX, "warmth");
  drawBar(ctx, 490, hudY + 8, 150, 16, p.health / HEALTH_MAX, "health");

  ctx.fillStyle = "#ccc";
  ctx.font = "12px monospace";
  ctx.fillText(`wood: ${p.wood}   soul: #${p.lineage}   ${isNight(state.tick) ? "night" : "day"}   noise: ${state.noise}`, 10, hudY + 44);
  ctx.fillText("WASD/arrows move · E gather (tree/bush/water) · F build fire (5 wood)", 10, hudY + 60);

  const logLines = state.log.slice(-3);
  ctx.fillStyle = "#d8c8a0";
  ctx.font = "12px monospace";
  logLines.forEach((line, i) => ctx.fillText(line, 10, hudY + 80 + i * 15));
}

export function drawDeathScreen(ctx: CanvasRenderingContext2D, w: number, h: number, o: Obituary, barrowList: Obituary[]): void {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8e0c8";
  ctx.font = "20px serif";
  ctx.textAlign = "center";
  ctx.fillText(`Soul #${o.lineage} — ${o.cause}.`, w / 2, h / 2 - 40);
  ctx.font = "14px serif";
  ctx.fillText(`Carried ${o.wood} wood. Survived ${(o.tick / 10).toFixed(0)}s.`, w / 2, h / 2 - 14);
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
