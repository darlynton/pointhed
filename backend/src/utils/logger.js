// Structured Logger Utility
// Provides consistent logging with levels, timestamps, and context

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;
const isProduction = process.env.NODE_ENV === 'production';

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  
  if (isProduction) {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  }
  
  // Human-readable format for development
  const icons = { error: '❌', warn: '⚠️', info: 'ℹ️', debug: '🔍' };
  return `${icons[level] || ''} [${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= currentLevel;
}

const logger = {
  error(message, meta = {}) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },
  
  warn(message, meta = {}) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  
  info(message, meta = {}) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, meta));
    }
  },
  
  debug(message, meta = {}) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, meta));
    }
  },
  
  // Log with request context
  req(req, level, message, meta = {}) {
    const enrichedMeta = {
      ...meta,
      reqId: req.id,
      method: req.method,
      path: req.path
    };
    this[level](message, enrichedMeta);
  }
};

export default logger;
