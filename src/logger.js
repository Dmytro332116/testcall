/**
 * LOGGER — Логування з кольорами та часовими мітками
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function timestamp() {
  return new Date().toLocaleTimeString('uk-UA');
}

const logger = {
  debug: (msg) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(`${colors.dim}[${timestamp()}] DEBUG ${msg}${colors.reset}`);
    }
  },
  info: (msg) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(`${colors.cyan}[${timestamp()}] INFO  ${msg}${colors.reset}`);
    }
  },
  warn: (msg) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.log(`${colors.yellow}[${timestamp()}] WARN  ${msg}${colors.reset}`);
    }
  },
  error: (msg) => {
    if (currentLevel <= LOG_LEVELS.error) {
      console.log(`${colors.red}[${timestamp()}] ERROR ${msg}${colors.reset}`);
    }
  },
  call: (msg) => {
    console.log(`${colors.green}[${timestamp()}] CALL  ${msg}${colors.reset}`);
  },
  banner: (msg) => {
    const line = '═'.repeat(50);
    console.log(`${colors.magenta}${line}\n  ${msg}\n${line}${colors.reset}`);
  },
};

module.exports = logger;
