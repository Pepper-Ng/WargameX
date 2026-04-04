const config = require('./src/config');
const app = require('./src/app');
const { initializeDatabase, warmInitialMapInBackground } = require('./src/db/init');
const { startGameLoop } = require('./src/engine/gameLoop');

async function bootstrap() {
  console.log('[startup] initializing database...');
  await initializeDatabase();

  app.listen(config.port, () => {
    console.log(`Wargame X backend listening on port ${config.port}`);
  });

  startGameLoop();

  // Do map warmup after server start so boot stays responsive.
  warmInitialMapInBackground();
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
