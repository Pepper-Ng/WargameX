const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'server.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function writeLine(line) {
  ensureLogDir();
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function log(scope, message) {
  const line = `[${formatTimestamp()}] [${scope}] ${message}`;
  console.log(line);
  writeLine(line);
}

function error(scope, message) {
  const line = `[${formatTimestamp()}] [${scope}] ERROR: ${message}`;
  console.error(line);
  writeLine(line);
}

module.exports = {
  log,
  error,
  formatTimestamp,
};
