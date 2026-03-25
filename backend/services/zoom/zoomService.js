/**
 * Zoom Server-to-Server OAuth Service
 * Handles token management and meeting CRUD operations.
 * Requires: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 */

const axios = require('axios');
const logger = require('../../utils/logger');

// Token cache — expires in ~1 hour, we refresh 60s early
let _accessToken = null;
let _tokenExpiry = null;

const getAccessToken = async () => {
  if (_accessToken && _tokenExpiry && Date.now() < _tokenExpiry) {
    return _accessToken;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom is not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET.');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    null,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  _accessToken = res.data.access_token;
  _tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  logger.info('Zoom access token refreshed');
  return _accessToken;
};

const authHeader = async () => ({ Authorization: `Bearer ${await getAccessToken()}` });

/**
 * Create a scheduled Zoom meeting.
 * Returns { meetingId, joinUrl, startUrl }
 */
const createMeeting = async ({ topic, startTime, durationMinutes = 60 }) => {
  const headers = await authHeader();

  const res = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic,
      type: 2, // scheduled
      start_time: new Date(startTime).toISOString(),
      duration: durationMinutes,
      timezone: 'UTC',
      settings: {
        join_before_host: true,
        waiting_room: false,
        approval_type: 0,
        audio: 'both',
        auto_recording: 'none',
      },
    },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  logger.info(`Zoom meeting created: ${res.data.id} — "${topic}"`);
  return {
    meetingId: String(res.data.id),
    joinUrl: res.data.join_url,
    startUrl: res.data.start_url,
  };
};

/**
 * Update a scheduled Zoom meeting (topic, time, duration).
 */
const updateMeeting = async (meetingId, { topic, startTime, durationMinutes }) => {
  const headers = await authHeader();

  const body = {};
  if (topic) body.topic = topic;
  if (startTime) body.start_time = new Date(startTime).toISOString();
  if (durationMinutes) body.duration = durationMinutes;

  await axios.patch(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    body,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  logger.info(`Zoom meeting updated: ${meetingId}`);
};

/**
 * Delete a Zoom meeting.
 */
const deleteMeeting = async (meetingId) => {
  const headers = await authHeader();
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, { headers });
  logger.info(`Zoom meeting deleted: ${meetingId}`);
};

module.exports = { createMeeting, updateMeeting, deleteMeeting };
