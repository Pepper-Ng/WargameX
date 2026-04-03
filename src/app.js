const express = require('express');
const authRoutes = require('./routes/authRoutes');
const forceRoutes = require('./routes/forceRoutes');
const mapRoutes = require('./routes/mapRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(authRoutes);
app.use(forceRoutes);
app.use(mapRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  const status = err.message && err.message.toLowerCase().includes('not found') ? 404 : 400;
  res.status(status).json({
    error: err.message || 'Unexpected server error',
  });
});

module.exports = app;
