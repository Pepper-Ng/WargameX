let tickInterval = null;
let tickCount = 0;

function startGameLoop() {
  if (tickInterval) return;

  tickInterval = setInterval(() => {
    tickCount += 1;
  }, 1000);
}

function stopGameLoop() {
  if (!tickInterval) return;
  clearInterval(tickInterval);
  tickInterval = null;
}

function getTickCount() {
  return tickCount;
}

module.exports = {
  startGameLoop,
  stopGameLoop,
  getTickCount,
};
