const db = require('./database');
const { addCustomApiSettings } = require('./customApiMigration');
const addTotpToUsersMigration = require('./addTotpToUsersMigration');

async function runMigration() {
  try {
    // Check if console_snapshot column exists in sessions table
    const tableInfo = await db.all("PRAGMA table_info(sessions)");
    const consoleSnapshotExists = tableInfo.some(column => column.name === 'console_snapshot');
    
    // Add console_snapshot column if it doesn't exist
    if (!consoleSnapshotExists) {
      console.log('Adding console_snapshot column to sessions table...');
      await db.run('ALTER TABLE sessions ADD COLUMN console_snapshot TEXT');
      console.log('Migration completed successfully.');
    } else {
      console.log('console_snapshot column already exists. No migration needed.');
    }

    // Create settings table if it doesn't exist
    const tablesResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'");
    const settingsTableExists = tablesResult.length > 0;

    if (!settingsTableExists) {
      console.log('Creating settings table...');
      await db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          is_sensitive BOOLEAN DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default settings
      await insertDefaultSettings();
      console.log('Settings table created and populated with defaults.');
    }
    
    // Check if role column exists in users table
    const usersTableInfo = await db.all("PRAGMA table_info(users)");
    const roleColumnExists = usersTableInfo.some(column => column.name === 'role');
    
    // Add role column if it doesn't exist
    if (!roleColumnExists) {
      console.log('Adding role column to users table...');
      await db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
      console.log('Users table migration completed successfully.');
    } else {
      console.log('role column already exists in users table. No migration needed.');
    }
    
    // Create user_settings table if it doesn't exist
    const userSettingsTableResult = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'");
    const userSettingsTableExists = userSettingsTableResult.length > 0;

    if (!userSettingsTableExists) {
      console.log('Creating user_settings table...');
      await db.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          setting_id TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (setting_id) REFERENCES settings (id) ON DELETE CASCADE,
          UNIQUE(user_id, setting_id)
        )
      `);
      console.log('User settings table created successfully.');
    }
    
    // Check if admin user exists, if not create one
    await createAdminUserIfNeeded();
    
    // Add registration control setting if it doesn't exist
    await addRegistrationControlSetting();
    
    // Add custom API settings if they don't exist
    await addCustomApiSettings();
    await addTotpToUsersMigration();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function createAdminUserIfNeeded() {
  const adminUser = await db.get('SELECT * FROM users WHERE role = "admin"');
  
  if (!adminUser) {
    console.log('No admin user found. Creating initial admin account...');
    
    // Check if there are any users at all
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count === 0) {
      // This is a fresh installation, create admin account
      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      
      // Generate a secure random password if no admin exists
      const crypto = require('crypto');
      const generatedPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(generatedPassword, saltRounds);
      
      await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      
      console.log(`
========================================================
INITIAL ADMIN ACCOUNT CREATED
Username: admin
Password: ${generatedPassword}
Please log in and change this password immediately!
========================================================
      `);
    } else {
      // There are existing users but no admin
      // Let's promote the first user to admin
      await db.run('UPDATE users SET role = "admin" WHERE id = (SELECT MIN(id) FROM users)');
      const promotedUser = await db.get('SELECT username FROM users WHERE role = "admin"');
      console.log(`Promoted user '${promotedUser.username}' to admin role.`);
    }
  } else {
    console.log(`Admin user '${adminUser.username}' already exists.`);
  }
}

async function addRegistrationControlSetting() {
  console.log('Checking settings categories...');
  
  // Check if registration_enabled setting exists
  const registrationSetting = await db.get('SELECT id, category FROM settings WHERE id = "registration_enabled"');
  
  if (!registrationSetting) {
    console.log('Registration setting not found. Adding registration control setting...');
    await db.run(
      'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
      ['registration_enabled', 'Enable Registration', 'true', 'server', 'Allow new users to register', 0]
    );
    console.log('Registration control setting added in server category.');
  } else {
    console.log(`Registration setting exists in category: ${registrationSetting.category}`);
    // Update category if it's in security
    if (registrationSetting.category === 'security') {
      console.log('Updating registration_enabled setting category from security to server...');
      await db.run('UPDATE settings SET category = "server" WHERE id = "registration_enabled"');
      console.log('Registration setting category updated to server.');
    } else {
      console.log('Registration setting already in correct category. No update needed.');
    }
  }
  
  // Also check if JWT expiration setting needs to be moved to server category
  const jwtSetting = await db.get('SELECT id, category FROM settings WHERE id = "jwt_expires_in"');
  if (!jwtSetting) {
    console.log('JWT expiration setting not found.');
  } else {
    console.log(`JWT expiration setting exists in category: ${jwtSetting.category}`);
    if (jwtSetting.category === 'security') {
      console.log('Updating jwt_expires_in setting category from security to server...');
      await db.run('UPDATE settings SET category = "server" WHERE id = "jwt_expires_in"');
      console.log('JWT expiration setting category updated to server.');
    } else {
      console.log('JWT expiration setting already in correct category. No update needed.');
    }
  }
  
  // Verify the current categories of both settings
  const settingsAfterUpdate = await db.all('SELECT id, category FROM settings WHERE id IN ("registration_enabled", "jwt_expires_in")');
  console.log('Current setting categories after updates:');
  settingsAfterUpdate.forEach(setting => {
    console.log(`- ${setting.id}: ${setting.category}`);
  });
}

async function insertDefaultSettings() {
  // Default settings from .env.example values
  const defaultSettings = [
    // LLM Helper settings
    { id: 'llm_provider', name: 'LLM Provider', value: 'openai', category: 'llm', description: 'LLM provider (openai, ollama, or custom)', is_sensitive: 0 },
    { id: 'openai_api_key', name: 'OpenAI API Key', value: '', category: 'llm', description: 'API key for OpenAI', is_sensitive: 1 },
    { id: 'openai_model', name: 'OpenAI Model', value: 'gpt-3.5-turbo', category: 'llm', description: 'Model name for OpenAI', is_sensitive: 0 },
    { id: 'ollama_url', name: 'Ollama URL', value: 'http://localhost:11434', category: 'llm', description: 'URL for Ollama API', is_sensitive: 0 },
    { id: 'ollama_model', name: 'Ollama Model', value: 'llama2', category: 'llm', description: 'Model name for Ollama', is_sensitive: 0 },
    { id: 'custom_api_url', name: 'Custom API URL', value: '', category: 'llm', description: 'Base URL for custom OpenAI-compatible API', is_sensitive: 0 },
    { id: 'custom_api_key', name: 'Custom API Key', value: '', category: 'llm', description: 'API key for custom OpenAI-compatible API', is_sensitive: 1 },
    { id: 'custom_model', name: 'Custom Model', value: 'gpt-3.5-turbo', category: 'llm', description: 'Model name for custom API', is_sensitive: 0 },
    
    // Encryption settings
    { id: 'encryption_key', name: 'Encryption Key', value: '736f4149702aae82ab6e45e64d977e3c6c1e9f7b29b368f61cafab1b9c2cc3b2', category: 'security', description: 'Encryption key for sensitive data', is_sensitive: 1 },
    
    // Server settings
    { id: 'cors_origin', name: 'CORS Origin', value: 'http://localhost:8080', category: 'server', description: 'Allowed CORS origin', is_sensitive: 0 },
    { id: 'rate_limit_window_ms', name: 'Rate Limit Window', value: '900000', category: 'server', description: 'Rate limit window in milliseconds', is_sensitive: 0 },
    { id: 'rate_limit_max_requests', name: 'Rate Limit Max Requests', value: '100', category: 'server', description: 'Maximum requests per rate limit window', is_sensitive: 0 },
    { id: 'site_name', name: 'Site Name', value: 'IntelliSSH', category: 'server', description: 'Name of the site for emails and UI', is_sensitive: 0 },
    
    // Authentication settings (admin only - global server settings)
    { id: 'jwt_expires_in', name: 'JWT Expiration', value: '24h', category: 'server', description: 'JWT token expiration time', is_sensitive: 0 },
    
    // Registration control (admin only - global server settings)
    { id: 'registration_enabled', name: 'Enable Registration', value: 'true', category: 'server', description: 'Allow new users to register', is_sensitive: 0 },
    
    // Email settings
    { id: 'smtp_host', name: 'SMTP Host', value: '', category: 'email', description: 'SMTP server hostname', is_sensitive: 0 },
    { id: 'smtp_port', name: 'SMTP Port', value: '587', category: 'email', description: 'SMTP server port', is_sensitive: 0 },
    { id: 'smtp_user', name: 'SMTP Username', value: '', category: 'email', description: 'SMTP server username', is_sensitive: 0 },
    { id: 'smtp_password', name: 'SMTP Password', value: '', category: 'email', description: 'SMTP server password', is_sensitive: 1 },
    { id: 'email_from', name: 'From Email', value: 'noreply@webssh.example.com', category: 'email', description: 'Email address used as sender', is_sensitive: 0 }
  ];

  // Insert each setting
  for (const setting of defaultSettings) {
    const existing = await db.get('SELECT id FROM settings WHERE id = ?', [setting.id]);
    
    if (!existing) {
      await db.run(
        'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
        [setting.id, setting.name, setting.value, setting.category, setting.description, setting.is_sensitive]
      );
    }
  }
}

// Export for use in other files
module.exports = { runMigration, insertDefaultSettings, addCustomApiSettings };

// Run migration if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(runMigration)
    .then(() => db.close())
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
