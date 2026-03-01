/**
 * Seeds Reducers - Client and server seed management for provably fair gaming.
 *
 * Each user has:
 * - One client seed (shared across all games)
 * - One active server seed per game type
 *
 * When a seed is rotated:
 * 1. The old server seed is revealed (marked inactive, revealedAt set)
 * 2. A new server seed is generated (hash published immediately)
 * 3. The nonce resets to 0
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  ServerSeeds,
  ClientSeeds,
  GameType,
  nowMs,
} from '../tables';
import { generateServerSeed, hashSeed } from '../provablyFair';
import { requireActiveUser } from './credits';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the active server seed for a user and game type.
 * Returns null if none found.
 */
export function getActiveSeed(
  identity: Identity,
  gameType: string,
): InstanceType<typeof ServerSeeds> | null {
  // SpacetimeDB: iterate over ServerSeeds rows matching identity and gameType
  // In practice, use a composite filter or scan:
  //   ServerSeeds.filterByIdentity(identity) returns all seeds for this user.
  //   We then find the one matching gameType and isActive === true.
  const seeds = ServerSeeds.filterByIdentity(identity);

  // filterByIdentity may return a single row or an iterable depending on
  // whether identity is the PK or just indexed. Since id is PK and identity
  // is just a column, we iterate.
  if (Array.isArray(seeds)) {
    for (const seed of seeds) {
      if (seed.gameType === gameType && seed.isActive) {
        return seed;
      }
    }
  } else if (seeds && seeds.gameType === gameType && seeds.isActive) {
    return seeds;
  }

  return null;
}

/**
 * Get the active server seed, throwing if not found.
 */
export function requireActiveSeed(
  identity: Identity,
  gameType: string,
): InstanceType<typeof ServerSeeds> {
  const seed = getActiveSeed(identity, gameType);
  if (!seed) {
    throw new Error(`No active server seed found for game type: ${gameType}`);
  }
  return seed;
}

/**
 * Get the client seed for a user, throwing if not found.
 */
export function getClientSeed(identity: Identity): string {
  const clientSeed = ClientSeeds.filterByIdentity(identity);
  if (!clientSeed) {
    throw new Error('Client seed not found. Please register first.');
  }
  return clientSeed.seed;
}

/**
 * Increment the nonce on an active server seed.
 * Call this after each game outcome is generated.
 *
 * @returns The nonce value BEFORE incrementing (to use for the current game)
 */
export function consumeNonce(
  identity: Identity,
  gameType: string,
): { serverSeed: InstanceType<typeof ServerSeeds>; nonce: number } {
  const seed = requireActiveSeed(identity, gameType);
  const currentNonce = seed.nonce;

  seed.nonce += 1;
  ServerSeeds.updateById(seed.id, seed);

  return { serverSeed: seed, nonce: currentNonce };
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Set a new client seed.
 * The client seed is used in combination with the server seed for
 * provably fair outcome generation.
 *
 * @param ctx - Reducer context
 * @param seed - New client seed string (1-64 chars)
 */
@reducer
export function setClientSeed(ctx: ReducerContext, seed: string): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate seed
  if (seed.length === 0) {
    throw new Error('Client seed cannot be empty');
  }
  if (seed.length > 64) {
    throw new Error('Client seed must be at most 64 characters');
  }
  // Only allow printable ASCII
  if (!/^[\x20-\x7E]+$/.test(seed)) {
    throw new Error('Client seed must contain only printable ASCII characters');
  }

  const clientSeed = ClientSeeds.filterByIdentity(callerIdentity);
  if (!clientSeed) {
    throw new Error('Client seed record not found. Please register first.');
  }

  clientSeed.seed = seed;
  clientSeed.updatedAt = nowMs();
  ClientSeeds.updateByIdentity(callerIdentity, clientSeed);
}

/**
 * Rotate the server seed for a specific game type.
 *
 * This:
 * 1. Reveals the current active server seed (makes it publicly verifiable)
 * 2. Generates a new active server seed
 * 3. Resets the nonce to 0
 *
 * Players can use the revealed seed + their client seed + nonces to
 * independently verify all past game outcomes.
 *
 * @param ctx - Reducer context
 * @param gameType - The game type to rotate the seed for
 */
@reducer
export function rotateSeed(ctx: ReducerContext, gameType: string): void {
  const callerIdentity = ctx.sender;
  requireActiveUser(callerIdentity);

  // Validate game type
  const validGameTypes = [
    GameType.Crash,
    GameType.Roulette,
    GameType.CoinFlip,
    GameType.Cases,
    GameType.Plinko,
    GameType.CaseBattle,
  ];

  if (!validGameTypes.includes(gameType as GameType)) {
    throw new Error(`Invalid game type: ${gameType}`);
  }

  const now = nowMs();

  // Find and reveal the current active seed
  const currentSeed = getActiveSeed(callerIdentity, gameType);
  if (currentSeed) {
    currentSeed.isActive = false;
    currentSeed.revealedAt = now;
    ServerSeeds.updateById(currentSeed.id, currentSeed);
  }

  // Generate a new server seed
  const newSeedValue = generateServerSeed(ctx);
  const newSeed = new ServerSeeds();
  newSeed.identity = callerIdentity;
  newSeed.seedHash = hashSeed(newSeedValue);
  newSeed.seed = newSeedValue;
  newSeed.nonce = 0;
  newSeed.isActive = true;
  newSeed.gameType = gameType;
  newSeed.createdAt = now;
  newSeed.revealedAt = 0n;
  ServerSeeds.insert(newSeed);
}
