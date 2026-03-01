/**
 * Chat Reducers - In-app messaging system.
 *
 * Supports multiple channels (e.g., "english", "general", "vip").
 * Messages are stored in the ChatMessages table and synced to
 * subscribers via SpacetimeDB's real-time subscription system.
 *
 * Admin operations:
 * - Delete messages (moderation)
 * - Ban users (prevents all actions including chat)
 */

import { reducer, ReducerContext, Identity } from '@clockworklabs/spacetimedb-sdk';
import {
  ChatMessages,
  Users,
  UserRole,
  nowMs,
} from '../tables';
import { requireAdmin, requireActiveUser } from './credits';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum message length */
const MIN_MESSAGE_LENGTH = 1;

/** Maximum message length */
const MAX_MESSAGE_LENGTH = 500;

/** Maximum channel name length */
const MAX_CHANNEL_LENGTH = 32;

/** Valid channel name pattern */
const CHANNEL_REGEX = /^[a-z0-9_-]+$/;

/** Rate limit: minimum ms between messages per user */
const RATE_LIMIT_MS = 1000; // 1 second

/** Allowed channels */
const ALLOWED_CHANNELS = ['english', 'turkish', 'russian', 'portuguese', 'general', 'vip'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the most recent message from a user for rate limiting.
 */
function getLastMessageTime(identity: Identity): bigint {
  let lastTime = 0n;
  for (const msg of ChatMessages.iter()) {
    if (
      (msg.identity as unknown as string) === (identity as unknown as string) &&
      msg.createdAt > lastTime
    ) {
      lastTime = msg.createdAt;
    }
  }
  return lastTime;
}

/**
 * Basic profanity/spam filter.
 * Returns true if the message should be blocked.
 * In production, use a more sophisticated filter.
 */
function isMessageBlocked(message: string): boolean {
  // Check for excessive caps (more than 80% uppercase in a message > 5 chars)
  if (message.length > 5) {
    const upperCount = (message.match(/[A-Z]/g) || []).length;
    const letterCount = (message.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.8) {
      return true;
    }
  }

  // Check for repeated characters (e.g., "aaaaaaa")
  if (/(.)\1{6,}/.test(message)) {
    return true;
  }

  // Check for link spam (basic check)
  const linkCount = (message.match(/https?:\/\//gi) || []).length;
  if (linkCount > 2) {
    return true;
  }

  return false;
}

// ─── Reducers ───────────────────────────────────────────────────────────────

/**
 * Send a chat message to a channel.
 *
 * @param ctx - Reducer context
 * @param channel - Channel name (e.g., "english", "general")
 * @param message - Message text
 */
@reducer
export function sendMessage(
  ctx: ReducerContext,
  channel: string,
  message: string,
): void {
  const callerIdentity = ctx.sender;
  const user = requireActiveUser(callerIdentity);

  // Validate channel
  if (channel.length === 0 || channel.length > MAX_CHANNEL_LENGTH) {
    throw new Error(`Channel name must be 1-${MAX_CHANNEL_LENGTH} characters`);
  }
  if (!CHANNEL_REGEX.test(channel)) {
    throw new Error('Channel name can only contain lowercase letters, numbers, hyphens, and underscores');
  }
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`Invalid channel. Allowed channels: ${ALLOWED_CHANNELS.join(', ')}`);
  }

  // VIP channel requires moderator or admin role
  if (channel === 'vip') {
    const userRecord = Users.filterByIdentity(callerIdentity);
    if (
      userRecord &&
      userRecord.role !== UserRole.Admin &&
      userRecord.role !== UserRole.Moderator
    ) {
      throw new Error('VIP channel is restricted to moderators and admins');
    }
  }

  // Validate message
  const trimmedMessage = message.trim();
  if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
    throw new Error('Message cannot be empty');
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
  }

  // Check for blocked content
  if (isMessageBlocked(trimmedMessage)) {
    throw new Error('Message blocked by content filter');
  }

  // Rate limiting
  const now = nowMs();
  const lastMessageTime = getLastMessageTime(callerIdentity);
  if (now - lastMessageTime < BigInt(RATE_LIMIT_MS)) {
    throw new Error('You are sending messages too quickly');
  }

  // Create the message
  const chatMsg = new ChatMessages();
  chatMsg.identity = callerIdentity;
  chatMsg.channel = channel;
  chatMsg.message = trimmedMessage;
  chatMsg.createdAt = now;
  ChatMessages.insert(chatMsg);
}

/**
 * Admin: Delete a chat message.
 *
 * @param ctx - Reducer context
 * @param messageId - ID of the message to delete
 */
@reducer
export function adminDeleteMessage(
  ctx: ReducerContext,
  messageId: number,
): void {
  const callerIdentity = ctx.sender;

  // Allow admins and moderators to delete messages
  const user = Users.filterByIdentity(callerIdentity);
  if (!user) {
    throw new Error('User not registered');
  }
  if (user.role !== UserRole.Admin && user.role !== UserRole.Moderator) {
    throw new Error('Unauthorized: moderator or admin role required');
  }

  const message = ChatMessages.filterById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  // Delete the message
  // SpacetimeDB: delete by primary key
  ChatMessages.deleteById(messageId);
}

/**
 * Admin: Ban a user.
 * Banned users cannot perform any actions (bets, chat, etc.).
 *
 * @param ctx - Reducer context
 * @param targetIdentity - Identity of the user to ban
 */
@reducer
export function adminBanUser(
  ctx: ReducerContext,
  targetIdentity: Identity,
): void {
  requireAdmin(ctx.sender);

  const targetUser = Users.filterByIdentity(targetIdentity);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  // Cannot ban admins
  if (targetUser.role === UserRole.Admin) {
    throw new Error('Cannot ban an admin');
  }

  // Already banned check
  if (targetUser.isBanned) {
    throw new Error('User is already banned');
  }

  targetUser.isBanned = true;
  Users.updateByIdentity(targetIdentity, targetUser);
}

/**
 * Admin: Unban a user.
 *
 * @param ctx - Reducer context
 * @param targetIdentity - Identity of the user to unban
 */
@reducer
export function adminUnbanUser(
  ctx: ReducerContext,
  targetIdentity: Identity,
): void {
  requireAdmin(ctx.sender);

  const targetUser = Users.filterByIdentity(targetIdentity);
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  if (!targetUser.isBanned) {
    throw new Error('User is not banned');
  }

  targetUser.isBanned = false;
  Users.updateByIdentity(targetIdentity, targetUser);
}
