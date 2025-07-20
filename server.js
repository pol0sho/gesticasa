const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ HTTP security headers
app.use(helmet());
app.set('trust proxy', 1); // Fixes "X-Forwarded-For" proxy issue

// 🧱 Parsers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// 🧠 PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 💾 Sessions
app.use(session({
  store: new pgSession({ pool, tableName: 'session', pruneSessionInterval: 60 }),
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

// 🚫 Rate limit login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Try again in 15 minutes.'
});

// 🔐 Login
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).send('Invalid email or password.');
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Invalid email or password.');

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
    res.clearCookie('connect.sid', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    });
    res.send('Logout successful!');
  });
});

// 💳 Create Stripe Checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { email, password, realEstateName } = req.body;

  if (!email || !password || !realEstateName)
    return res.status(400).send('Missing fields.');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Gesticasa Registration and Monthly Subscription Plan',
          description: `For ${realEstateName}`
        },
        unit_amount: 10
      },
      quantity: 1
    }],
    success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/register`,
    metadata: {
      email,
      password,
      realEstateName
    }
  });

  res.json({ url: session.url });
});

// 📬 Webhook to finalize registration
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { email, password, realEstateName } = session.metadata;
    const subdomain = realEstateName.replace(/\s+/g, '').toLowerCase() + '.gesticasa.com';

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(`
        INSERT INTO users (email, password, real_estate_name, subdomain)
        VALUES ($1, $2, $3, $4)
      `, [email, hashedPassword, realEstateName, subdomain]);
    } catch (err) {
      if (err.code !== '23505') console.error('User creation error after payment:', err);
    }
  }

  res.json({ received: true });
});

// ✅ Server start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
