const db = require('./database');

async function runEmailSettingsMigration() {
  try {
    console.log('Starting email settings migration...');
    
    // Email settings to add
    const emailSettings = [
      { id: 'smtp_host', name: 'SMTP Host', value: '', category: 'email', description: 'SMTP server hostname', is_sensitive: 0 },
      { id: 'smtp_port', name: 'SMTP Port', value: '587', category: 'email', description: 'SMTP server port', is_sensitive: 0 },
      { id: 'smtp_user', name: 'SMTP Username', value: '', category: 'email', description: 'SMTP server username', is_sensitive: 0 },
      { id: 'smtp_password', name: 'SMTP Password', value: '', category: 'email', description: 'SMTP server password', is_sensitive: 1 },
      { id: 'email_from', name: 'From Email', value: 'noreply@webssh.example.com', category: 'email', description: 'Email address used as sender', is_sensitive: 0 }
    ];
    
    // Check if settings already exist
    for (const setting of emailSettings) {
      const existing = await db.get('SELECT id FROM settings WHERE id = ?', [setting.id]);
      
      if (!existing) {
        console.log(`Adding setting: ${setting.id}`);
        await db.run(
          'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
          [setting.id, setting.name, setting.value, setting.category, setting.description, setting.is_sensitive]
        );
      } else {
        console.log(`Setting ${setting.id} already exists.`);
      }
    }
    
    console.log('Email settings migration completed successfully.');
  } catch (error) {
    console.error('Email settings migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(runEmailSettingsMigration)
    .then(() => db.close())
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { runEmailSettingsMigration };
