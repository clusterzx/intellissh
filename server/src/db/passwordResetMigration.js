const db = require('./database');

async function runPasswordResetMigration() {
  try {
    console.log('Starting password reset migration...');
    
    // Check if reset_token column exists in users table
    const usersTableInfo = await db.all("PRAGMA table_info(users)");
    const resetTokenExists = usersTableInfo.some(column => column.name === 'reset_token');
    const resetTokenExpiresExists = usersTableInfo.some(column => column.name === 'reset_token_expires');
    
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
      await db.run('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME');
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
