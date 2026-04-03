let tickInterval = null;

function startGameLoop() {
  if (tickInterval) return;

  // This is intentionally minimal for now.
  tickInterval = setInterval(() => {
    console.log('tick');
  }, 1000);
}

function stopGameLoop() {
  if (!tickInterval) return;
  clearInterval(tickInterval);
  tickInterval = null;
}

module.exports = {
  startGameLoop,
  stopGameLoop,
};
