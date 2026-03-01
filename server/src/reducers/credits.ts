/**
 * Credits Reducers - Balance management, deposits, and admin operations.
 *
 * All monetary amounts are in integer cents (u64 via bigint).
 * Every balance change creates a transaction record for auditing.
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  Users,
  Balances,
  Transactions,
  UserRole,
  TransactionType,
  GameType,
  nowMs,
} from '../tables';

// ─── Internal Balance Helpers ───────────────────────────────────────────────

/**
 * Deduct credits from a user's balance.
 * Throws if insufficient funds.
 *
 * @param identity - The user's identity
 * @param amount - Amount in cents to deduct (must be > 0)
 * @returns The new balance after deduction
 */
export function deductBalance(identity: Identity, amount: bigint): bigint {
  if (amount <= 0n) {
    throw new Error('Deduction amount must be positive');
  }

  const bal = Balances.filterByIdentity(identity);
  if (!bal) {
    throw new Error('User balance not found');
  }

  if (bal.balance < amount) {
    throw new Error(
      `Insufficient balance: have ${bal.balance}, need ${amount}`,
    );
  }

  bal.balance -= amount;
  Balances.updateByIdentity(identity, bal);

  return bal.balance;
}

/**
 * Credit (add) credits to a user's balance.
 *
 * @param identity - The user's identity
 * @param amount - Amount in cents to add (must be > 0)
 * @returns The new balance after credit
 */
export function creditBalance(identity: Identity, amount: bigint): bigint {
  if (amount <= 0n) {
    throw new Error('Credit amount must be positive');
  }

  const bal = Balances.filterByIdentity(identity);
  if (!bal) {
    throw new Error('User balance not found');
  }

  bal.balance += amount;
  Balances.updateByIdentity(identity, bal);

  return bal.balance;
}

/**
 * Record a transaction in the immutable ledger.
 *
 * @param identity - The user who owns this transaction
 * @param txType - Type of transaction
 * @param amount - Signed amount (positive = credit, negative = debit)
 * @param gameType - The game that triggered this (or empty string)
 * @param gameRoundId - The round/game ID (or 0)
 * @param balanceAfter - User's balance after this transaction
 */
export function recordTransaction(
  identity: Identity,
  txType: string,
  amount: bigint,
  gameType: string,
  gameRoundId: number,
  balanceAfter: bigint,
): void {
  const tx = new Transactions();
  // id is auto-incremented by SpacetimeDB
  tx.identity = identity;
  tx.txType = txType;
  tx.amount = amount;
  tx.gameType = gameType;
  tx.gameRoundId = gameRoundId;
  tx.balanceAfter = balanceAfter;
  tx.createdAt = nowMs();
  Transactions.insert(tx);
}

/**
 * Update the wager tracking on a user's balance.
 */
export function trackWager(identity: Identity, amount: bigint): void {
  const bal = Balances.filterByIdentity(identity);
  if (!bal) return;
  bal.totalWagered += amount;
  Balances.updateByIdentity(identity, bal);
}

/**
 * Update the winnings tracking on a user's balance.
 */
export function trackWinnings(identity: Identity, amount: bigint): void {
  const bal = Balances.filterByIdentity(identity);
  if (!bal) return;
  bal.totalWon += amount;
  Balances.updateByIdentity(identity, bal);
}

// ─── Admin Guard ────────────────────────────────────────────────────────────

/**
 * Verify that the caller has admin role.
 * Throws if not admin.
 */
export function requireAdmin(callerIdentity: Identity): void {
  const user = Users.filterByIdentity(callerIdentity);
  if (!user) {
    throw new Error('User not registered');
  }
  if (user.role !== UserRole.Admin) {
    throw new Error('Unauthorized: admin role required');
  }
}

/**
 * Verify that the caller is registered and not banned.
 * Returns the user record.
 */
export function requireActiveUser(callerIdentity: Identity): typeof Users.prototype {
  const user = Users.filterByIdentity(callerIdentity);
  if (!user) {
    throw new Error('User not registered');
  }
  if (user.isBanned) {
    throw new Error('Account is banned');
  }
  return user;
}

// ─── Admin Reducers ─────────────────────────────────────────────────────────

/**
 * Admin: Grant credits to a target user.
 * Creates a transaction record for auditing.
 *
 * @param ctx - Reducer context
 * @param targetIdentity - Identity of the user to receive credits
 * @param amount - Amount in cents to grant (u64)
 */
@reducer
export function adminGrantCredits(
  ctx: ReducerContext,
  targetIdentity: Identity,
  amount: bigint,
): void {
  requireAdmin(ctx.sender);

  if (amount <= 0n) {
    throw new Error('Amount must be positive');
  }

  // Verify target user exists
  const targetUser = Users.filterByIdentity(targetIdentity);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // Credit the balance
  const newBalance = creditBalance(targetIdentity, amount);

  // Update deposit tracking
  const bal = Balances.filterByIdentity(targetIdentity);
  if (bal) {
    bal.totalDeposited += amount;
    Balances.updateByIdentity(targetIdentity, bal);
  }

  // Record transaction
  recordTransaction(
    targetIdentity,
    TransactionType.AdminGrant,
    amount,
    '',
    0,
    newBalance,
  );
}

/**
 * Admin: Deduct credits from a target user.
 * Creates a transaction record for auditing.
 *
 * @param ctx - Reducer context
 * @param targetIdentity - Identity of the user to deduct from
 * @param amount - Amount in cents to deduct (u64)
 */
@reducer
export function adminDeductCredits(
  ctx: ReducerContext,
  targetIdentity: Identity,
  amount: bigint,
): void {
  requireAdmin(ctx.sender);

  if (amount <= 0n) {
    throw new Error('Amount must be positive');
  }

  // Verify target user exists
  const targetUser = Users.filterByIdentity(targetIdentity);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // Deduct the balance (throws if insufficient)
  const newBalance = deductBalance(targetIdentity, amount);

  // Record transaction
  recordTransaction(
    targetIdentity,
    TransactionType.AdminDeduct,
    -amount, // Negative for deductions
    '',
    0,
    newBalance,
  );
}
