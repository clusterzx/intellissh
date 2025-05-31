const db = require('./database');

async function runUserProfileMigration() {
  try {
    console.log('Starting user profile migration...');
    
    // Check if email column exists in users table
    const usersTableInfo = await db.all("PRAGMA table_info(users)");
    const emailColumnExists = usersTableInfo.some(column => column.name === 'email');
    
    // Add email column if it doesn't exist
    if (!emailColumnExists) {
      console.log('Adding email column to users table...');
      await db.run('ALTER TABLE users ADD COLUMN email TEXT');
      console.log('Email column added successfully.');
    } else {
      console.log('Email column already exists in users table. No migration needed.');
    }
    
    console.log('User profile migration completed successfully.');
  } catch (error) {
    console.error('User profile migration failed:', error);
  }
}

// Export for use in other files
module.exports = { runUserProfileMigration };

// Run migration if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(runUserProfileMigration)
    .then(() => db.close())
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
