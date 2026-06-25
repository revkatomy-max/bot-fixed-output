// src/utils/cooldownManager.js

const cooldowns = new Map();

export function checkCooldown(key, userId, ms) {
  const mapKey = `${key}:${userId}`;
  const now = Date.now();
  const entry = cooldowns.get(mapKey);

  if (entry && now < entry) {
    return Math.ceil((entry - now) / 1000);
  }

  cooldowns.set(mapKey, now + ms);

  // Auto-cleanup
  setTimeout(() => cooldowns.delete(mapKey), ms + 1000);

  return 0;
}

export function clearCooldown(key, userId) {
  cooldowns.delete(`${key}:${userId}`);
}

export default { checkCooldown, clearCooldown };
