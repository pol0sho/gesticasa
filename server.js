const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 3000;
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 🧠 PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🛡️ HTTP headers
app.use(helmet());
app.set('trust proxy', 1);

// 🧾 Sessions
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

// ⚠️ Skip bodyParser on /webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    bodyParser.urlencoded({ extended: true })(req, res, () => {
      bodyParser.json()(req, res, next);
    });
  }
});

// 📂 Static files
app.use(express.static('public'));

// 🚫 Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Try again in 15 minutes.'
});

app.post('/invite-agent', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).send('Missing email');

  const token = crypto.randomBytes(32).toString('hex');
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // seconds

  try {
    // Store token
    await pool.query(`
      INSERT INTO agent_invites (email, token, expires_at)
      VALUES ($1, $2, to_timestamp($3 / 1000))
      ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = to_timestamp($3 / 1000)
    `, [email, token, expiration]);

    const inviteLink = `https://inmosuite.onrender.com/agent-register?token=${token}`;

    // SMTP config using .env values
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"Gestihouse" <${process.env.SMTP_FROM || process.env.SMTP_EMAIL}>`,
      to: email,
      subject: 'Invitation to join your real estate team on Gestihouse',
      html: `
        <p>You’ve been invited to join your real estate team on <strong>Gestihouse</strong>.</p>
        <p>
          <a href="${inviteLink}" style="padding:10px 20px; background:#2ecc71; color:#fff; text-decoration:none; border-radius:5px">
            Click here to register your agent account
          </a>
        </p>
        <p>This link is valid for 24 hours.</p>
      `
    });

    res.send('✅ Invitation email sent.');
  } catch (err) {
    console.error('❌ Failed to send invite:', err);
    res.status(500).send('Failed to send invitation.');
  }
});

// 🔐 Login
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

// 💳 Create Stripe checkout session for monthly subscription
app.post('/create-checkout-session', async (req, res) => {
  const { email, password, realEstateName } = req.body;

  if (!email || !password || !realEstateName)
    return res.status(400).send('Missing fields.');

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        price: 'price_1RnHOxCeECuKcry8F1mth7Lj', // 🔁 Replace with your actual monthly Stripe Price ID
        quantity: 1
      }],
      success_url: `${process.env.BASE_URL || 'http://inmosuite.onrender.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://inmosuite.onrender.com'}/`,
      metadata: {
        email,
        password,
        realEstateName
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).send('Failed to create Stripe session.');
  }
});

app.get('/check-session', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

// ✅ Serve success confirmation
app.get('/success', (req, res) => {
  res.sendFile(__dirname + '/public/success.html');
});

// 📬 Stripe webhook to create user after successful payment
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { email, password, realEstateName } = session.metadata;
    const subdomain = realEstateName.replace(/\s+/g, '').toLowerCase() + '.gesticasa.com';

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(`
        INSERT INTO users (email, password, real_estate_name, subdomain)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `, [email, hashedPassword, realEstateName, subdomain]);

    } catch (err) {
      console.error('User creation error after payment:', err);
    }
  }

  res.json({ received: true });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
