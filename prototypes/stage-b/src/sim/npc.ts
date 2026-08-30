/**
 * The village — a handful of people who are content (doc/world/CONTENT.md
 * §2.5), not Wild and not his. They exist so the arrival custom
 * (doc/world/PLAN.md §1A) has someone to actually perform it: "they take
 * you in, they feed you, and they watch you for a season."
 *
 * Pure code, deliberately: §27's Intelligence Tiers reserve a live model
 * for Captains and Wardens and give even a Lieutenant only "light template
 * + Codex." A villager is well below that — a bounded wander and a static
 * conversation tree (dialogue.ts) is the whole of what one is.
 */
import { TILE, distSq } from "./fixed.js";
import { Rng } from "./rng.js";
import { World, VILLAGE_X, VILLAGE_Y } from "./world.js";
import { stepToward, moveWithCollision, walkable } from "./move.js";

export type NpcRole = "teacher" | "villager";

/** Roughly a person: tougher than a hare, not armoured. */
export const NPC_HEALTH = 20;
export const NPC_WANDER_SPEED = 60; // slower than a grazing deer — a villager isn't going anywhere
export const NPC_WANDER_RADIUS = TILE * 3; // stays near the houses
export const NPC_ROT_TICKS = 900; // same grace as a carcass before the village quietly replaces someone
export const NPC_RESPAWN_TICKS = 1800; // longer than a beast's — a person is not livestock

export interface Npc {
  id: number;
  role: NpcRole;
  name: string;
  x: number;
  y: number;
  health: number;
  alive: boolean;
  wanderX: number;
  wanderY: number;
  diedAtTick: number;
  respawnAtTick: number; // 0 while alive
}

const VILLAGER_NAMES = ["Mara", "Old Corwin", "Sennet"];

function newNpc(id: number, role: NpcRole, name: string, x: number, y: number): Npc {
  return { id, role, name, x, y, health: NPC_HEALTH, alive: true, wanderX: x, wanderY: y, diedAtTick: 0, respawnAtTick: 0 };
}

/**
 * The Teacher and a handful of villagers, placed at the village center
 * (world.ts's VILLAGE_X/Y) — small on purpose (§8: "a hamlet of eight
 * people is invisible"). The Teacher is always the same one; losing her
 * to a bad decision costs the village its tutorial until she is replaced.
 */
export function spawnNpcs(): Npc[] {
  const cx = VILLAGE_X * TILE;
  const cy = VILLAGE_Y * TILE;
  const npcs: Npc[] = [newNpc(0, "teacher", "the Teacher", cx, cy - TILE)];
  VILLAGER_NAMES.forEach((name, i) => {
    npcs.push(newNpc(i + 1, "villager", name, cx + (i - 1) * TILE, cy + TILE));
  });
  return npcs;
}

function findWanderTile(world: World, rng: Rng, cx: number, cy: number): { x: number; y: number } {
  for (let attempt = 0; attempt < 32; attempt++) {
    const x = cx + rng.nextInt(NPC_WANDER_RADIUS * 2 + 1) - NPC_WANDER_RADIUS;
    const y = cy + rng.nextInt(NPC_WANDER_RADIUS * 2 + 1) - NPC_WANDER_RADIUS;
    if (walkable(world, x, y)) return { x, y };
  }
  return { x: cx, y: cy };
}

/**
 * A villager's whole behaviour: amble toward a nearby point, pick a new
 * one on arrival. No fleeing, no hunting, no noticing a soul at all — the
 * one thing that makes them not a beast is that they are worth talking to
 * (dialogue.ts), not that they react to anything.
 */
export function stepNpc(npc: Npc, world: World, rng: Rng, tick: number): void {
  if (!npc.alive) {
    if (npc.respawnAtTick === 0 && tick - npc.diedAtTick >= NPC_ROT_TICKS) npc.respawnAtTick = tick + NPC_RESPAWN_TICKS;
    if (npc.respawnAtTick !== 0 && tick >= npc.respawnAtTick) {
      const spot = findWanderTile(world, rng, VILLAGE_X * TILE, VILLAGE_Y * TILE);
      npc.x = spot.x;
      npc.y = spot.y;
      npc.health = NPC_HEALTH;
      npc.alive = true;
      npc.diedAtTick = 0;
      npc.respawnAtTick = 0;
    }
    return;
  }

  if (distSq(npc.x, npc.y, npc.wanderX, npc.wanderY) < (TILE / 2) * (TILE / 2)) {
    const spot = findWanderTile(world, rng, VILLAGE_X * TILE, VILLAGE_Y * TILE);
    npc.wanderX = spot.x;
    npc.wanderY = spot.y;
  }
  const next = stepToward(npc.x, npc.y, npc.wanderX, npc.wanderY, NPC_WANDER_SPEED);
  const moved = moveWithCollision(world, npc.x, npc.y, next.x, next.y);
  npc.x = moved.x;
  npc.y = moved.y;
}

/** Returns true if the strike killed them. */
export function woundNpc(npc: Npc, damage: number, tick: number): boolean {
  npc.health -= damage;
  if (npc.health <= 0) {
    npc.health = 0;
    npc.alive = false;
    npc.diedAtTick = tick;
    return true;
  }
  return false;
}
