/**
 * Provably Fair - Cryptographic utilities for verifiable game outcomes.
 *
 * All game outcomes are determined by:
 *   HMAC-SHA256(serverSeed, clientSeed:nonce)
 *
 * The server seed hash is published before play begins. After rotation,
 * the actual seed is revealed so players can verify outcomes.
 *
 * Uses Node.js crypto module which is available in SpacetimeDB's
 * TypeScript runtime (WASI-compatible subset).
 */

import { createHmac, createHash, randomBytes } from 'crypto';
import { ReducerContext } from '@clockworklabs/spacetimedb-sdk';

// ─── Core Cryptographic Functions ───────────────────────────────────────────

/**
 * Generate a cryptographically secure random server seed.
 * In SpacetimeDB, we use ctx for deterministic randomness within the module.
 * For seed generation we use crypto.randomBytes for true randomness.
 *
 * NOTE: SpacetimeDB reducers run deterministically across replicas.
 * In production, seed generation should use ctx.random() or a
 * SpacetimeDB-provided RNG to maintain consensus. We use randomBytes
 * here as a reference implementation; replace with ctx-based RNG
 * if required by your SpacetimeDB version.
 */
export function generateServerSeed(_ctx: ReducerContext): string {
  // Generate 32 bytes of randomness, encode as hex
  // In SpacetimeDB module context, use ctx.random() for deterministic RNG:
  //   const bytes = new Uint8Array(32);
  //   for (let i = 0; i < 32; i++) bytes[i] = Math.floor(ctx.random() * 256);
  //   return Buffer.from(bytes).toString('hex');
  return randomBytes(32).toString('hex');
}

/**
 * SHA-256 hash of a seed string, returned as hex.
 * This hash is published to players BEFORE any bets are placed,
 * allowing post-game verification.
 */
export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

/**
 * Generate a deterministic outcome using HMAC-SHA256.
 *
 * @param serverSeed - The secret server seed
 * @param clientSeed - The player's chosen client seed
 * @param nonce - Incrementing nonce for each game played with this seed pair
 * @returns Hex string of the HMAC-SHA256 digest
 */
export function generateOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): string {
  const message = `${clientSeed}:${nonce}`;
  return createHmac('sha256', serverSeed).update(message).digest('hex');
}

// ─── Game-Specific Outcome Converters ───────────────────────────────────────

/**
 * Convert a hex hash to a crash point multiplier.
 *
 * Algorithm:
 * 1. Take the first 8 hex chars (32 bits) of the hash.
 * 2. Convert to a number in [0, 2^32).
 * 3. Apply house edge: if hash mod (1/houseEdge) === 0, instant crash (1.00x).
 * 4. Otherwise, compute: (2^32) / (hash + 1) * (1 - houseEdge)
 * 5. Floor to 2 decimal places, minimum 1.00.
 *
 * @param hash - 64-char hex string (HMAC result)
 * @param houseEdge - House edge as decimal (default 0.04 = 4%)
 * @returns Crash point multiplier (e.g. 1.00, 2.57, 100.34)
 */
export function crashPointFromHash(hash: string, houseEdge: number = 0.04): number {
  // Use first 13 hex characters for higher precision (52 bits)
  const hashValue = parseInt(hash.substring(0, 13), 16);

  // Instant crash check: ~4% of rounds crash at 1.00x
  // If the hash mod (1/houseEdge) === 0, it's an instant crash
  const instantCrashDivisor = Math.floor(1 / houseEdge);
  if (hashValue % instantCrashDivisor === 0) {
    return 1.0;
  }

  // Calculate crash point
  // Formula: E / (E - h) where E = 2^52 and h = hashValue
  // Adjusted for house edge
  const e = Math.pow(2, 52);
  const rawCrashPoint = (e / (e - hashValue)) * (1 - houseEdge);

  // Floor to 2 decimal places, minimum 1.00
  const crashPoint = Math.max(1.0, Math.floor(rawCrashPoint * 100) / 100);

  return crashPoint;
}

/**
 * Convert a hex hash to a roulette result (0-14).
 *
 * Mapping:
 *   0 = green (1 out of 15 = ~6.67%)
 *   1-7 = red (7 out of 15 = ~46.67%)
 *   8-14 = black (7 out of 15 = ~46.67%)
 *
 * @param hash - 64-char hex string
 * @returns Number 0-14
 */
export function rouletteFromHash(hash: string): number {
  // Take first 8 hex chars, convert to number, mod 15
  const hashValue = parseInt(hash.substring(0, 8), 16);
  return hashValue % 15;
}

/**
 * Get the color for a roulette result number.
 */
export function rouletteColorFromResult(result: number): string {
  if (result === 0) return 'green';
  if (result >= 1 && result <= 7) return 'red';
  return 'black';
}

/**
 * Convert a hex hash to a coin flip result.
 *
 * @param hash - 64-char hex string
 * @returns 'ct' or 't'
 */
export function coinFlipFromHash(hash: string): string {
  // Take first 8 hex chars, convert to number
  const hashValue = parseInt(hash.substring(0, 8), 16);
  // Even = CT, Odd = T
  return hashValue % 2 === 0 ? 'ct' : 't';
}

/**
 * Generate a plinko ball path from hash data.
 *
 * Each row requires one bit of randomness to decide Left or Right.
 * We generate a fresh HMAC for each row using nonce sub-indexing.
 *
 * @param serverSeed - Server seed
 * @param clientSeed - Client seed
 * @param nonce - Base nonce
 * @param rows - Number of plinko rows (8, 12, or 16)
 * @returns Array of 'L' or 'R' for each row
 */
export function plinkoPathFromHash(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number,
): string[] {
  const path: string[] = [];

  for (let i = 0; i < rows; i++) {
    // Generate a unique hash for each row decision
    const rowHash = generateOutcome(serverSeed, clientSeed, nonce * 1000 + i);
    const value = parseInt(rowHash.substring(0, 8), 16);
    path.push(value % 2 === 0 ? 'L' : 'R');
  }

  return path;
}

/**
 * Determine which bucket a plinko ball lands in based on its path.
 * The bucket index is the count of 'R' moves (0 to rows).
 *
 * @param path - Array of 'L'/'R' directions
 * @returns Bucket index (0 to path.length)
 */
export function plinkoBucketFromPath(path: string[]): number {
  return path.filter((d) => d === 'R').length;
}

/**
 * Convert a hex hash to a weighted roll number for case openings.
 *
 * @param hash - 64-char hex string
 * @param totalWeight - Sum of all item weights in the case
 * @returns Roll number in [0, totalWeight)
 */
export function caseRollFromHash(hash: string, totalWeight: number): number {
  // Use first 12 hex chars for a large number
  const hashValue = parseInt(hash.substring(0, 12), 16);
  // Map to [0, totalWeight)
  return hashValue % totalWeight;
}

/**
 * Build a seed data JSON string for storing with game results.
 */
export function buildSeedData(
  serverSeedId: number,
  clientSeed: string,
  nonce: number,
): string {
  return JSON.stringify({
    serverSeedId,
    clientSeed,
    nonce,
  });
}

/**
 * Parse seed data JSON string.
 */
export function parseSeedData(seedData: string): {
  serverSeedId: number;
  clientSeed: string;
  nonce: number;
} {
  return JSON.parse(seedData);
}
