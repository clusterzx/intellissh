const db = require('./database');

async function createCredentialsTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'password' or 'private_key'
      username TEXT,
      password TEXT, -- encrypted
      private_key TEXT, -- encrypted
      passphrase TEXT, -- encrypted
      iv TEXT, -- Initialization Vector for encryption
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `;

  try {
    await db.run(createTableSql);
    console.log('Credentials table created or already exists.');
  } catch (error) {
    console.error('Error creating credentials table:', error.message);
    throw error;
  }
}

module.exports = { createCredentialsTable };
