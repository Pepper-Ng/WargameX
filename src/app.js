const path = require('path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const forceRoutes = require('./routes/forceRoutes');
const mapRoutes = require('./routes/mapRoutes');
const debugRoutes = require('./routes/debugRoutes');
const { getTickCount } = require('./engine/gameLoop');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '../public')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(2)),
    tickCount: getTickCount(),
  });
});

app.use(authRoutes);
app.use(forceRoutes);
app.use(mapRoutes);
app.use(debugRoutes);

app.use((err, req, res, next) => {
  logger.error('API', err.message || 'Unexpected error');

  const status = err.status || (err.message && err.message.toLowerCase().includes('not found') ? 404 : 500);

  res.status(status).json({
    error: err.message || 'Unexpected server error',
  });
});

module.exports = app;
