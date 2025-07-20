// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://inmosuite_user:GlNtF89gavaJzBX3Vv3jGyzPe3vdOwGM@dpg-d1smp82li9vc73c8hsr0-a.frankfurt-postgres.render.com/inmosuite',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};