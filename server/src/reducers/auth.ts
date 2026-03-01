/**
 * Auth Reducers - User registration and profile management.
 *
 * SpacetimeDB authenticates users via their Identity, which is derived
 * from their connection credentials. These reducers handle initial
 * registration and profile updates.
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  Users,
  Balances,
  ClientSeeds,
  ServerSeeds,
  UserRole,
  GameType,
  nowMs,
} from '../tables';
import { generateServerSeed, hashSeed } from '../provablyFair';

// ─── Username Validation ────────────────────────────────────────────────────

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const DISPLAY_NAME_MAX_LENGTH = 32;
const AVATAR_URL_MAX_LENGTH = 512;

function validateUsername(username: string): void {
  if (username.length < USERNAME_MIN_LENGTH) {
    throw new Error(`Username must be at least ${USERNAME_MIN_LENGTH} characters`);
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Username must be at most ${USERNAME_MAX_LENGTH} characters`);
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
  }
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * Creates:
 * - User profile (Users table)
 * - Initial balance of 0 (Balances table)
 * - Default client seed (ClientSeeds table)
 * - Active server seeds for all game types (ServerSeeds table)
 *
 * @param ctx - SpacetimeDB reducer context (contains caller identity)
 * @param username - Unique username (3-20 chars, alphanumeric + _ -)
 * @param displayName - Display name shown in UI
 */
@reducer
export function registerUser(
  ctx: ReducerContext,
  username: string,
  displayName: string,
): void {
  const callerIdentity = ctx.sender;
  const now = nowMs();

  // Validate inputs
  validateUsername(username);
  if (displayName.length === 0) {
    displayName = username;
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new Error(`Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`);
  }

  // Check if user already exists
  // SpacetimeDB: filterByIdentity returns the row if it exists (PK lookup)
  const existingUser = Users.filterByIdentity(callerIdentity);
  if (existingUser) {
    throw new Error('User already registered');
  }

  // Check if username is taken
  // SpacetimeDB: filterByUsername uses the unique index
  const existingUsername = Users.filterByUsername(username);
  if (existingUsername) {
    throw new Error('Username already taken');
  }

  // Create user profile
  const user = new Users();
  user.identity = callerIdentity;
  user.username = username.toLowerCase();
  user.displayName = displayName;
  user.avatarUrl = '';
  user.role = UserRole.User;
  user.createdAt = now;
  user.lastSeenAt = now;
  user.isBanned = false;
  Users.insert(user);

  // Create initial balance (0 credits)
  const balance = new Balances();
  balance.identity = callerIdentity;
  balance.balance = 0n;
  balance.totalWagered = 0n;
  balance.totalWon = 0n;
  balance.totalDeposited = 0n;
  balance.totalWithdrawn = 0n;
  Balances.insert(balance);

  // Create default client seed
  const clientSeed = new ClientSeeds();
  clientSeed.identity = callerIdentity;
  clientSeed.seed = generateDefaultClientSeed(callerIdentity);
  clientSeed.updatedAt = now;
  ClientSeeds.insert(clientSeed);

  // Create active server seeds for all game types
  const gameTypes = [
    GameType.Crash,
    GameType.Roulette,
    GameType.CoinFlip,
    GameType.Cases,
    GameType.Plinko,
    GameType.CaseBattle,
  ];

  for (const gameType of gameTypes) {
    const seed = generateServerSeed(ctx);
    const serverSeed = new ServerSeeds();
    serverSeed.identity = callerIdentity;
    serverSeed.seedHash = hashSeed(seed);
    serverSeed.seed = seed;
    serverSeed.nonce = 0;
    serverSeed.isActive = true;
    serverSeed.gameType = gameType;
    serverSeed.createdAt = now;
    serverSeed.revealedAt = 0n;
    ServerSeeds.insert(serverSeed);
  }
}

/**
 * Update user profile (display name and/or avatar URL).
 *
 * @param ctx - SpacetimeDB reducer context
 * @param displayName - New display name (empty string = no change)
 * @param avatarUrl - New avatar URL (empty string = no change)
 */
@reducer
export function updateProfile(
  ctx: ReducerContext,
  displayName: string,
  avatarUrl: string,
): void {
  const callerIdentity = ctx.sender;

  const user = Users.filterByIdentity(callerIdentity);
  if (!user) {
    throw new Error('User not registered');
  }

  if (user.isBanned) {
    throw new Error('Account is banned');
  }

  // Update display name if provided
  if (displayName.length > 0) {
    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new Error(`Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`);
    }
    user.displayName = displayName;
  }

  // Update avatar URL if provided
  if (avatarUrl.length > 0) {
    if (avatarUrl.length > AVATAR_URL_MAX_LENGTH) {
      throw new Error(`Avatar URL must be at most ${AVATAR_URL_MAX_LENGTH} characters`);
    }
    // Basic URL validation
    if (!avatarUrl.startsWith('https://')) {
      throw new Error('Avatar URL must use HTTPS');
    }
    user.avatarUrl = avatarUrl;
  }

  // Update last seen timestamp
  user.lastSeenAt = nowMs();

  // SpacetimeDB: Update the row (PK-based update)
  Users.updateByIdentity(callerIdentity, user);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic default client seed from the user's identity.
 * Users can change this later via setClientSeed.
 */
function generateDefaultClientSeed(identity: Identity): string {
  // Use a portion of the identity bytes as the default seed
  const identityHex = Buffer.from(identity as unknown as Uint8Array).toString('hex');
  return identityHex.substring(0, 16);
}
