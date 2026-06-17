const bcrypt = require('bcrypt');

const createUserTable = async (db) => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      fullname VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.query(queryText);
};

const findUserByEmail = async (db, email) => {
  const { rows } = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0] || null;
};

const createUser = async (db, { fullname, email, password, role = 'admin' }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    'INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, fullname, email, role, created_at',
    [fullname, email, hashedPassword, role]
  );
  return rows[0];
};

module.exports = {
  createUserTable,
  findUserByEmail,
  createUser,
};
