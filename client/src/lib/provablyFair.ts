/**
 * Provably Fair verification utilities using the Web Crypto API (SubtleCrypto).
 *
 * All hashing is done client-side so users can independently verify outcomes.
 */

// ── Helpers ──

const encoder = new TextEncoder();

/** SHA-256 hash of a string, returned as a hex string. */
export async function hashSeed(seed: string): Promise<string> {
  const data = encoder.encode(seed);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(buf);
}

/** HMAC-SHA256(key, message), returned as a hex string. */
export async function hmacSha256(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return bufToHex(sig);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Convert a hex string to a number between 0 and 1. Uses the first 8 hex chars (32 bits). */
function hexToFloat(hex: string): number {
  const int = parseInt(hex.slice(0, 8), 16);
  return int / 0xffffffff;
}

/** Convert a hex string to an integer. Uses the first 8 hex chars. */
function hexToInt(hex: string): number {
  return parseInt(hex.slice(0, 8), 16);
}

// ── Crash ──

/**
 * Verify the crash point for a given round.
 *
 * The crash point is computed as:
 *   hash = HMAC-SHA256(serverSeed, clientSeed:nonce)
 *   float = hexToFloat(hash)  // 0..1
 *   crashPoint = max(1, floor((1 - houseEdge) / (1 - float) * 100) / 100)
 *
 * Returns the crash point multiplier (e.g. 2.47).
 */
export async function verifyCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdge: number = 0.04,
): Promise<number> {
  const message = `${clientSeed}:${nonce}`;
  const hash = await hmacSha256(serverSeed, message);
  const e = hexToInt(hash);

  // 1 in 25 chance of instant crash (house edge mechanism)
  if (e % 25 === 0) return 1.0;

  const h = e / 0xffffffff;
  const crashPoint = Math.floor(((1 - houseEdge) / (1 - h)) * 100) / 100;
  return Math.max(1, crashPoint);
}

// ── Roulette ──

/**
 * Verify the roulette result (0-14 inclusive).
 *
 * hash = HMAC-SHA256(serverSeed, clientSeed:nonce)
 * result = hexToInt(hash) % 15
 *
 * 0 = green, 1-7 = red, 8-14 = black
 */
export async function verifyRouletteResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<number> {
  const message = `${clientSeed}:${nonce}`;
  const hash = await hmacSha256(serverSeed, message);
  return hexToInt(hash) % 15;
}

/**
 * Map a roulette result index to a color.
 */
export function rouletteResultToColor(result: number): "green" | "red" | "black" {
  if (result === 0) return "green";
  if (result >= 1 && result <= 7) return "red";
  return "black";
}

// ── Coin Flip ──

/**
 * Verify a coin flip result.
 *
 * hash = HMAC-SHA256(serverSeed, clientSeed:nonce)
 * result = hexToInt(hash) % 2   → 0 = CT, 1 = T
 */
export async function verifyCoinFlip(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<"CT" | "T"> {
  const message = `${clientSeed}:${nonce}`;
  const hash = await hmacSha256(serverSeed, message);
  return hexToInt(hash) % 2 === 0 ? "CT" : "T";
}

// ── Plinko ──

/**
 * Verify the plinko ball path for a given number of rows.
 *
 * For each row, a direction (left or right) is determined:
 *   hash = HMAC-SHA256(serverSeed, clientSeed:nonce:rowIndex)
 *   direction = hexToInt(hash) % 2  → 0 = left, 1 = right
 *
 * Returns an array of directions (0 | 1) and the final bucket index.
 */
export async function verifyPlinkoPath(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number,
): Promise<{ path: number[]; bucket: number }> {
  const path: number[] = [];
  let bucket = 0;

  for (let i = 0; i < rows; i++) {
    const message = `${clientSeed}:${nonce}:${i}`;
    const hash = await hmacSha256(serverSeed, message);
    const dir = hexToInt(hash) % 2; // 0 = left, 1 = right
    path.push(dir);
    bucket += dir;
  }

  return { path, bucket };
}

// ── Cases ──

/**
 * Verify a case roll (used for case openings and case battles).
 *
 * hash = HMAC-SHA256(serverSeed, clientSeed:nonce)
 * roll = hexToInt(hash) % totalWeight
 *
 * The roll is compared against the item weight ranges to determine the won item.
 */
export async function verifyCaseRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  totalWeight: number,
): Promise<number> {
  const message = `${clientSeed}:${nonce}`;
  const hash = await hmacSha256(serverSeed, message);
  return hexToInt(hash) % totalWeight;
}

// ── Verification Result Types ──

export interface SeedInfo {
  serverSeedHash: string; // SHA-256 hash of the server seed (shown before reveal)
  serverSeed?: string; // Revealed after rotation
  clientSeed: string;
  nonce: number;
}

export interface VerificationResult {
  game: string;
  input: SeedInfo;
  output: string;
  verified: boolean;
}
