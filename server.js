const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Basic HTTP security headers
app.use(helmet());


// 🧠 PostgreSQL pool for session store
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 💾 Persistent session storage with cleanup
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    pruneSessionInterval: 60 // clean expired sessions every 60s
  }),
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2 // 2 hours
  }
}));

// 🚫 Rate limiter for login route to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit to 5 requests per IP
  message: 'Too many login attempts. Try again in 15 minutes.'
});

// 🔐 Login
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).send('Invalid email or password.');
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).send('Invalid email or password.');
    }
    req.session.userId = user.id;
    req.session.email = user.email;
    res.send('Login successful!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error.');
  }
});

// 🔓 Logout
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.send('Logout successful!');
  });
});

// 📝 Register
app.post('/register', async (req, res) => {
  const { email, password, confirmPassword, realEstateName } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const subdomain = realEstateName.replace(/\s+/g, '').toLowerCase() + '.gesticasa.com';

    const insertUserQuery = `
      INSERT INTO users (email, password, real_estate_name, subdomain)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const result = await db.query(insertUserQuery, [
      email,
      hashedPassword,
      realEstateName,
      subdomain
    ]);

    res.send('Registration successful!');
  } catch (err) {
    console.error(err);

    if (err.code === '23505') { // PostgreSQL unique_violation error code
      if (err.detail.includes('email')) {
        return res.status(400).send('This email is already registered.');
      } else if (err.detail.includes('real_estate_name')) {
        return res.status(400).send('This real estate name is already in use.');
      } else if (err.detail.includes('subdomain')) {
        return res.status(400).send('This real estate name is already in use.');
      }
    }

    res.status(500).send('Error saving user.');
  }
});

// ✅ Run server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});