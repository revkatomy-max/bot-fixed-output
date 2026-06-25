// src/utils/permissions.js
import config from '../config/config.js';

export function isModerator(member) {
  if (!member) return false;
  if (member.guild.ownerId === member.id) return true;
  const modRoleId = config.roles.moderator;
  const adminRoleId = config.roles.admin;
  return (
    member.roles.cache.has(modRoleId) ||
    member.roles.cache.has(adminRoleId) ||
    member.permissions.has('Administrator')
  );
}

export function isAdmin(member) {
  if (!member) return false;
  if (member.guild.ownerId === member.id) return true;
  const adminRoleId = config.roles.admin;
  return (
    member.roles.cache.has(adminRoleId) ||
    member.permissions.has('Administrator')
  );
}

export function isOwner(member) {
  if (!member) return false;
  return member.guild.ownerId === member.id;
}

export default { isModerator, isAdmin, isOwner };
