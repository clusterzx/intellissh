const db = require('./database');

async function runPasswordResetMigration() {
  try {
    console.log('Starting password reset migration...');

    // Check if reset_token column exists in users table
    let resetTokenExists = false;
    let resetTokenExpiresExists = false;

    if (db.type === 'postgres') {
      const columns = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
      const columnNames = columns.map(c => c.column_name); // Lowercase usually
      // Check case-insensitive
      const lowerColumnNames = columnNames.map(c => c.toLowerCase());

      resetTokenExists = lowerColumnNames.includes('reset_token');
      resetTokenExpiresExists = lowerColumnNames.includes('reset_token_expires');
    } else {
      const usersTableInfo = await db.all("PRAGMA table_info(users)");
      resetTokenExists = usersTableInfo.some(column => column.name === 'reset_token');
      resetTokenExpiresExists = usersTableInfo.some(column => column.name === 'reset_token_expires');
    }

    // Add reset_token column if it doesn't exist
    if (!resetTokenExists) {
      console.log('Adding reset_token column to users table...');
      await db.run('ALTER TABLE users ADD COLUMN reset_token TEXT');
      console.log('Reset token column added successfully.');
    } else {
      console.log('Reset token column already exists in users table. No migration needed.');
    }

    // Add reset_token_expires column if it doesn't exist
    if (!resetTokenExpiresExists) {
      console.log('Adding reset_token_expires column to users table...');
      const TIMESTAMP_TYPE = db.type === 'postgres' ? 'TIMESTAMP' : 'DATETIME';
      await db.run(`ALTER TABLE users ADD COLUMN reset_token_expires ${TIMESTAMP_TYPE}`);
      console.log('Reset token expires column added successfully.');
    } else {
      console.log('Reset token expires column already exists in users table. No migration needed.');
    }

    console.log('Password reset migration completed successfully.');
  } catch (error) {
    console.error('Password reset migration failed:', error);
  }
}

// Export for use in other files
module.exports = { runPasswordResetMigration };

// Run migration if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(runPasswordResetMigration)
    .then(() => db.close())
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
