const { get, run } = require('../db/database');

async function getMapState() {
  return get('SELECT * FROM map_state WHERE id = 1');
}

async function expandMapState(minX, maxX, minY, maxY) {
  await run(
    `INSERT INTO map_state (id, min_x, max_x, min_y, max_y)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       min_x = MIN(min_x, excluded.min_x),
       max_x = MAX(max_x, excluded.max_x),
       min_y = MIN(min_y, excluded.min_y),
       max_y = MAX(max_y, excluded.max_y),
       updated_at = CURRENT_TIMESTAMP`,
    [minX, maxX, minY, maxY]
  );
}

module.exports = {
  getMapState,
  expandMapState,
};
