/**
 * How many messages the live (post-compaction) chat window holds before the
 * next user turn auto-compacts the earlier history. Shared so the API trigger
 * and the composer's capacity ring agree on the same number.
 */
export const COMPACTION_MESSAGE_LIMIT = 30;
