const db = require('./database');

async function createCredentialsTable() {
  const PRIMARY_KEY_AUTO = db.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const TIMESTAMP_TYPE = db.type === 'postgres' ? 'TIMESTAMP' : 'DATETIME';

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS credentials (
      id ${PRIMARY_KEY_AUTO},
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'password' or 'private_key'
      username TEXT,
      password TEXT, -- encrypted
      private_key TEXT, -- encrypted
      passphrase TEXT, -- encrypted
      iv TEXT, -- Initialization Vector for encryption
      created_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
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
