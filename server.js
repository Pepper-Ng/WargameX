const config = require('./src/config');
const app = require('./src/app');
const { initializeDatabase, warmInitialMapInBackground } = require('./src/db/init');
const { startGameLoop } = require('./src/engine/gameLoop');
const logger = require('./src/utils/logger');

async function bootstrap() {
  logger.log('Startup', 'Initializing database...');
  await initializeDatabase();
  logger.log('Startup', 'Database initialization finished.');

  logger.log('Startup', `Starting HTTP server on port ${config.port}...`);
  app.listen(config.port, () => {
    logger.log('Startup', `HTTP server started on port ${config.port}.`);
  });

  logger.log('Startup', 'Starting game loop...');
  startGameLoop();
  logger.log('Startup', 'Game loop started.');

  logger.log('Startup', 'Starting map warmup task...');
  warmInitialMapInBackground();
  logger.log('Startup', 'Map warmup task started.');
}

bootstrap().catch((error) => {
  logger.error('Startup', `Server bootstrap failed: ${error.message}`);
  process.exit(1);
});
