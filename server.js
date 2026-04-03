const config = require('./src/config');
const app = require('./src/app');
const { initializeDatabase } = require('./src/db/init');
const { startGameLoop } = require('./src/engine/gameLoop');

async function bootstrap() {
  await initializeDatabase();

  app.listen(config.port, () => {
    console.log(`Wargame X backend listening on port ${config.port}`);
  });

  startGameLoop();
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
