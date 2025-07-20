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

  // Basic validation
  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match.');
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to DB
    await db.query(
      'INSERT INTO users (email, password, real_estate_name) VALUES ($1, $2, $3)',
      [email, hashedPassword, realEstateName]
    );

    res.send('Registration successful!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving user.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});