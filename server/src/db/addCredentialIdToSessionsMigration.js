const db = require('./database');

async function addCredentialIdToSessionsTable() {
  try {
    // Check if credential_id column exists in sessions table
    const tableInfo = await db.all("PRAGMA table_info(sessions)");
    const credentialIdExists = tableInfo.some(column => column.name === 'credential_id');

    // Add credential_id column if it doesn't exist
    if (!credentialIdExists) {
      console.log('Adding credential_id column to sessions table...');
      await db.run('ALTER TABLE sessions ADD COLUMN credential_id INTEGER');
      console.log('credential_id column added to sessions table.');
    } else {
      console.log('credential_id column already exists in sessions table. No migration needed.');
    }
  } catch (error) {
    console.error('Error adding credential_id to sessions table:', error.message);
    throw error;
  }
}

module.exports = { addCredentialIdToSessionsTable };
