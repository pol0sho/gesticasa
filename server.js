const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});