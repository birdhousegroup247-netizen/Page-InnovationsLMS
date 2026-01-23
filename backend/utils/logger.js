const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Check if we can create/access logs directory
const logsDir = path.join(__dirname, '../logs');
let canUseFileTransport = false;

if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    canUseFileTransport = true;
  } catch (error) {
    console.warn('Could not create logs directory, using console only:', error.message);
  }
} else {
  canUseFileTransport = true;
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Build transports array - always include console
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  })
];

// Only add file transports if directory is accessible (not in Railway/cloud)
if (canUseFileTransport && process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
});

module.exports = logger;
