async function up({ run }) {
  await run('CREATE INDEX IF NOT EXISTS idx_forces_xy ON forces(x, y)');
  await run('CREATE INDEX IF NOT EXISTS idx_tiles_xy ON tiles(x, y)');
}

module.exports = { up };
