const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    const dbPath = process.env.DB_PATH || './data/webssh.db';
    const dbDir = path.dirname(dbPath);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database.');
          this.initializeTables()
            .then(() => this.insertDefaultSettings())
            .then(() => this.createAdminUserIfNeeded())
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async insertDefaultSettings() {
    // Default settings from .env.example values
    const defaultSettings = [
      // LLM Helper settings
      { id: 'llm_provider', name: 'LLM Provider', value: 'openai', category: 'llm', description: 'LLM provider (openai or ollama)', is_sensitive: 0 },
      { id: 'openai_api_key', name: 'OpenAI API Key', value: '', category: 'llm', description: 'API key for OpenAI', is_sensitive: 1 },
      { id: 'openai_model', name: 'OpenAI Model', value: 'gpt-3.5-turbo', category: 'llm', description: 'Model name for OpenAI', is_sensitive: 0 },
      { id: 'ollama_url', name: 'Ollama URL', value: 'http://localhost:11434', category: 'llm', description: 'URL for Ollama API', is_sensitive: 0 },
      { id: 'ollama_model', name: 'Ollama Model', value: 'llama2', category: 'llm', description: 'Model name for Ollama', is_sensitive: 0 },
      
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
      const existing = await this.get('SELECT id FROM settings WHERE id = ?', [setting.id]);
      
      if (!existing) {
        await this.run(
          'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
          [setting.id, setting.name, setting.value, setting.category, setting.description, setting.is_sensitive]
        );
      }
    }
    console.log('Default settings initialized.');
  }

  async createAdminUserIfNeeded() {
    const adminUser = await this.get('SELECT * FROM users WHERE role = "admin"');
    
    if (!adminUser) {
      console.log('No admin user found. Creating initial admin account...');
      
      // Check if there are any users at all
      const userCount = await this.get('SELECT COUNT(*) as count FROM users');
      
      if (userCount.count === 0) {
        // This is a fresh installation, create admin account
        const bcrypt = require('bcrypt');
        const saltRounds = 12;
        
        // Generate a secure random password if no admin exists
        const crypto = require('crypto');
        const generatedPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(generatedPassword, saltRounds);
        
        await this.run(
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
        await this.run('UPDATE users SET role = "admin" WHERE id = (SELECT MIN(id) FROM users)');
        const promotedUser = await this.get('SELECT username FROM users WHERE role = "admin"');
        console.log(`Promoted user '${promotedUser.username}' to admin role.`);
      }
    } else {
      console.log(`Admin user '${adminUser.username}' already exists.`);
    }
  }

  async initializeTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT "user",
        reset_token TEXT,
        reset_token_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        hostname TEXT NOT NULL,
        port INTEGER DEFAULT 22,
        username TEXT NOT NULL,
        password TEXT,
        private_key TEXT,
        key_passphrase TEXT,
        iv TEXT,
        credential_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        console_snapshot TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_sensitive BOOLEAN DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUserSettingsTable = `
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
    `;

    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createSessionTagsTable = `
      CREATE TABLE IF NOT EXISTS session_tags (
        session_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, tag_id),
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createUsersTable, (err) => {
          if (err) {
            console.error('Error creating users table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createSessionsTable, (err) => {
          if (err) {
            console.error('Error creating sessions table:', err.message);
            reject(err);
            return;
          }
        });
        
        this.db.run(createSettingsTable, (err) => {
          if (err) {
            console.error('Error creating settings table:', err.message);
            reject(err);
            return;
          }
        });
        
        this.db.run(createUserSettingsTable, (err) => {
          if (err) {
            console.error('Error creating user_settings table:', err.message);
            reject(err);
            return;
          }

          this.db.run(createTagsTable, (err) => {
            if (err) {
              console.error('Error creating tags table:', err.message);
              reject(err);
              return;
            }

            this.db.run(createSessionTagsTable, (err) => {
              if (err) {
                console.error('Error creating session_tags table:', err.message);
                reject(err);
                return;
              }

              console.log('Database tables initialized.');
              resolve();
            });
          });
        });
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed.');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();
