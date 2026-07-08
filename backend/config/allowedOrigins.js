/**
 * Single source of truth for browser origins allowed to call the API.
 *
 * Used by BOTH the Express CORS middleware (server.js) and the Socket.IO
 * CORS config (config/socket.js). They used to be two separate lists —
 * the HTTP one knew the Railway production URLs, the socket one only knew
 * FRONTEND_URL/ADMIN_FRONTEND_URL + localhost. Result: REST worked in
 * production while every websocket handshake was CORS-rejected, so chat
 * fell back to "messages appear after refresh".
 */

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173', // Main app dev
  'http://localhost:5174', // Admin app dev
  process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
  // Production URLs - custom domains
  'https://learn.pageinnovations.com.ng',
  'https://admin.pageinnovations.com.ng',
  // Production URLs - Railway (kept as fallback)
  'https://student-lms-production-13d4.up.railway.app',
  'https://admin-lms-production.up.railway.app',
];

module.exports = { allowedOrigins };
