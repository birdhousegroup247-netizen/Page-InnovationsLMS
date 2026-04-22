/**
 * Discord Bot Service
 * Handles all Discord REST API calls.
 * Requires: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
 * For OAuth auto-join: also needs DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI
 */

const axios = require('axios');
const logger = require('../../utils/logger');

const BASE = 'https://discord.com/api/v10';

const isConfigured = () =>
  !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);

const botHeaders = () => ({
  Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Get or create a Discord role for a course.
 * Returns the role ID.
 */
const getOrCreateRole = async (roleName) => {
  const guildId = process.env.DISCORD_GUILD_ID;

  const { data: roles } = await axios.get(`${BASE}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
  });

  const existing = roles.find((r) => r.name === roleName);
  if (existing) return existing.id;

  const { data: created } = await axios.post(
    `${BASE}/guilds/${guildId}/roles`,
    { name: roleName, permissions: '0', mentionable: false },
    { headers: botHeaders() }
  );

  logger.info(`Discord: created role "${roleName}" (${created.id})`);
  return created.id;
};

/**
 * Get or create a private text channel for a course.
 * Returns the channel ID.
 */
const getOrCreateChannel = async (channelName, roleId) => {
  const guildId = process.env.DISCORD_GUILD_ID;

  // Discord channel names: lowercase, no spaces
  const sanitized = channelName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  const { data: channels } = await axios.get(`${BASE}/guilds/${guildId}/channels`, {
    headers: botHeaders(),
  });

  const existing = channels.find((c) => c.name === sanitized && c.type === 0);
  if (existing) return existing.id;

  const { data: created } = await axios.post(
    `${BASE}/guilds/${guildId}/channels`,
    {
      name: sanitized,
      type: 0, // text channel
      permission_overwrites: [
        { id: guildId, type: 0, deny: '1024' },  // @everyone: deny VIEW_CHANNEL
        { id: roleId,  type: 0, allow: '1024' }, // course role: allow VIEW_CHANNEL
      ],
    },
    { headers: botHeaders() }
  );

  logger.info(`Discord: created channel "#${sanitized}" (${created.id})`);
  return created.id;
};

/**
 * Add a user to the guild using their Discord OAuth access token.
 * Requires guilds.join scope.
 */
const addMemberToGuild = async (discordUserId, userAccessToken) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  await axios.put(
    `${BASE}/guilds/${guildId}/members/${discordUserId}`,
    { access_token: userAccessToken },
    { headers: botHeaders() }
  );
  logger.info(`Discord: added user ${discordUserId} to guild`);
};

/**
 * Assign a role to a guild member.
 */
const assignRole = async (discordUserId, roleId) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  await axios.put(
    `${BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {},
    { headers: botHeaders() }
  );
  logger.info(`Discord: assigned role ${roleId} to user ${discordUserId}`);
};

/**
 * Remove a role from a guild member.
 */
const removeRole = async (discordUserId, roleId) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  await axios.delete(
    `${BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { headers: botHeaders() }
  );
  logger.info(`Discord: removed role ${roleId} from user ${discordUserId}`);
};

/**
 * Kick a member from the guild entirely.
 */
const kickMember = async (discordUserId) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  await axios.delete(`${BASE}/guilds/${guildId}/members/${discordUserId}`, {
    headers: botHeaders(),
  });
  logger.info(`Discord: kicked user ${discordUserId} from guild`);
};

/**
 * Check if a user is in the guild. Returns member data or null.
 */
const getMember = async (discordUserId) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  try {
    const { data } = await axios.get(
      `${BASE}/guilds/${guildId}/members/${discordUserId}`,
      { headers: botHeaders() }
    );
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Create a permanent invite link for a channel.
 */
const createChannelInvite = async (channelId) => {
  const { data } = await axios.post(
    `${BASE}/channels/${channelId}/invites`,
    { max_age: 0, max_uses: 0 },
    { headers: botHeaders() }
  );
  return `https://discord.gg/${data.code}`;
};

/**
 * Exchange OAuth authorization code for tokens.
 */
const exchangeCode = async (code) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });

  const { data } = await axios.post(`${BASE}/oauth2/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

/**
 * Get Discord user info using their OAuth access token.
 */
const getDiscordUser = async (accessToken) => {
  const { data } = await axios.get(`${BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

module.exports = {
  isConfigured,
  getOrCreateRole,
  getOrCreateChannel,
  addMemberToGuild,
  assignRole,
  removeRole,
  kickMember,
  getMember,
  createChannelInvite,
  exchangeCode,
  getDiscordUser,
};
