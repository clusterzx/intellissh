const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.pool = null;
    this.type = process.env.DB_TYPE || 'sqlite';
  }

  async connect() {
    if (this.type === 'postgres') {
      return this.connectPostgres();
    } else {
      return this.connectSqlite();
    }
  }

  async connectPostgres() {
    // Check if PG specific env vars are set, otherwise use default mapping
    const dbConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
        user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
        host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
        database: process.env.DB_NAME || process.env.POSTGRES_DB || 'webssh',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
      };

    const connectionInfo = process.env.DATABASE_URL
      ? 'using connection string'
      : `at ${dbConfig.host}:${dbConfig.port}`;

    console.log(`Connecting to PostgreSQL ${connectionInfo}...`);
    this.pool = new Pool(dbConfig);

    try {
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database.');
      client.release();

      return this.initializeTables()
        .then(() => this.insertDefaultSettings())
        .then(() => this.createAdminUserIfNeeded());
    } catch (err) {
      console.error('Error connecting to PostgreSQL:', err.message);
      throw err;
    }
  }

  async connectSqlite() {
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

  _transformQuery(sql) {
    if (this.type !== 'postgres') return sql;

    let paramCount = 1;
    return sql.replace(/\?/g, () => `$${paramCount++}`);
  }

  async insertDefaultSettings() {
    // Default settings from .env.example values
    // Default settings from .env.example values
    const defaultSettings = [
      // LLM Helper settings
      { id: 'llm_provider', name: 'LLM Provider', value: 'openai', category: 'llm', description: 'LLM provider (openai, ollama, or custom)', is_sensitive: false },
      { id: 'openai_api_key', name: 'OpenAI API Key', value: '', category: 'llm', description: 'API key for OpenAI', is_sensitive: true },
      { id: 'openai_model', name: 'OpenAI Model', value: 'gpt-3.5-turbo', category: 'llm', description: 'Model name for OpenAI', is_sensitive: false },
      { id: 'ollama_url', name: 'Ollama URL', value: 'http://localhost:11434', category: 'llm', description: 'URL for Ollama API', is_sensitive: false },
      { id: 'ollama_model', name: 'Ollama Model', value: 'llama2', category: 'llm', description: 'Model name for Ollama', is_sensitive: false },
      { id: 'custom_api_url', name: 'Custom API URL', value: '', category: 'llm', description: 'Base URL for custom OpenAI-compatible API', is_sensitive: false },
      { id: 'custom_api_key', name: 'Custom API Key', value: '', category: 'llm', description: 'API key for custom OpenAI-compatible API', is_sensitive: true },
      { id: 'custom_model', name: 'Custom Model', value: 'gpt-3.5-turbo', category: 'llm', description: 'Model name for custom API', is_sensitive: false },

      // Encryption settings
      { id: 'encryption_key', name: 'Encryption Key', value: '736f4149702aae82ab6e45e64d977e3c6c1e9f7b29b368f61cafab1b9c2cc3b2', category: 'security', description: 'Encryption key for sensitive data', is_sensitive: true },

      // Server settings
      { id: 'cors_origin', name: 'CORS Origin', value: 'http://localhost:8080', category: 'server', description: 'Allowed CORS origin', is_sensitive: false },
      { id: 'rate_limit_window_ms', name: 'Rate Limit Window', value: '900000', category: 'server', description: 'Rate limit window in milliseconds', is_sensitive: false },
      { id: 'rate_limit_max_requests', name: 'Rate Limit Max Requests', value: '100', category: 'server', description: 'Maximum requests per rate limit window', is_sensitive: false },
      { id: 'site_name', name: 'Site Name', value: 'IntelliSSH', category: 'server', description: 'Name of the site for emails and UI', is_sensitive: false },

      // Authentication settings (admin only - global server settings)
      { id: 'jwt_expires_in', name: 'JWT Expiration', value: '24h', category: 'server', description: 'JWT token expiration time', is_sensitive: false },

      // Registration control (admin only - global server settings)
      { id: 'registration_enabled', name: 'Enable Registration', value: 'true', category: 'server', description: 'Allow new users to register', is_sensitive: false },

      // Email settings
      { id: 'smtp_host', name: 'SMTP Host', value: '', category: 'email', description: 'SMTP server hostname', is_sensitive: false },
      { id: 'smtp_port', name: 'SMTP Port', value: '587', category: 'email', description: 'SMTP server port', is_sensitive: false },
      { id: 'smtp_user', name: 'SMTP Username', value: '', category: 'email', description: 'SMTP server username', is_sensitive: false },
      { id: 'smtp_password', name: 'SMTP Password', value: '', category: 'email', description: 'SMTP server password', is_sensitive: true },
      { id: 'email_from', name: 'From Email', value: 'noreply@webssh.example.com', category: 'email', description: 'Email address used as sender', is_sensitive: false }
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
    const adminUser = await this.get("SELECT * FROM users WHERE role = 'admin'");

    if (!adminUser) {
      console.log('No admin user found. Creating initial admin account...');

      // Check if there are any users at all
      const userCount = await this.get('SELECT COUNT(*) as count FROM users');

      // Handle count difference: Postgres returns string for count sometimes, or object {count: '0'}
      const count = this.type === 'postgres' ? parseInt(userCount.count) : userCount.count;

      if (count === 0) {
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
        await this.run("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)");
        const promotedUser = await this.get("SELECT username FROM users WHERE role = 'admin'");
        console.log(`Promoted user '${promotedUser.username}' to admin role.`);
      }
    } else {
      console.log(`Admin user '${adminUser.username}' already exists.`);
    }
  }

  async initializeTables() {
    // Determine data types based on DB type
    const PRIMARY_KEY_AUTO = this.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const DATETIME_DEFAULT = 'timestamp DEFAULT CURRENT_TIMESTAMP'; // Postgres doesn't strictly like DATETIME, uses timestamp
    // SQLite accepts DATETIME as TEXT/NUMERIC iso8601 usually.
    // Let's stick to standard SQL as much as possible.

    // SQLite: DATETIME DEFAULT CURRENT_TIMESTAMP
    // Postgres: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    const TIMESTAMP_TYPE = this.type === 'postgres' ? 'TIMESTAMP' : 'DATETIME';

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id ${PRIMARY_KEY_AUTO},
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        reset_token TEXT,
        reset_token_expires ${TIMESTAMP_TYPE},
        created_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        totpSecret TEXT,
        is2faEnabled INTEGER DEFAULT 0
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id ${PRIMARY_KEY_AUTO},
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        hostname TEXT NOT NULL,
        port INTEGER DEFAULT 22,
        username TEXT NOT NULL,
        password TEXT,
        private_key TEXT,
        key_passphrase TEXT,
        iv TEXT,
        created_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        console_snapshot TEXT,
        credential_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createCredentialsTable = `
      CREATE TABLE IF NOT EXISTS credentials (
        id ${PRIMARY_KEY_AUTO},
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        username TEXT,
        password TEXT,
        private_key TEXT,
        passphrase TEXT,
        iv TEXT,
        created_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `;

    const BOOL_FALSE = this.type === 'postgres' ? 'FALSE' : '0';

    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_sensitive BOOLEAN DEFAULT ${BOOL_FALSE},
        updated_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUserSettingsTable = `
      CREATE TABLE IF NOT EXISTS user_settings (
        id ${PRIMARY_KEY_AUTO},
        user_id INTEGER NOT NULL,
        setting_id TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at ${TIMESTAMP_TYPE} DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (setting_id) REFERENCES settings (id) ON DELETE CASCADE,
        UNIQUE(user_id, setting_id)
      )
    `;

    if (this.type === 'postgres') {
      const client = await this.pool.connect();
      try {
        await client.query(createUsersTable);
        await client.query(createSessionsTable);
        await client.query(createCredentialsTable);
        await client.query(createSettingsTable);
        await client.query(createUserSettingsTable);
        console.log('Database tables initialized (PostgreSQL).');
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.run(createUsersTable);
          this.db.run(createSessionsTable);
          this.db.run(createCredentialsTable); // Need to make sure this is created if missed in previous versions
          this.db.run(createSettingsTable);
          this.db.run(createUserSettingsTable, (err) => {
            if (err) {
              console.error('Error creating tables:', err.message);
              reject(err);
              return;
            }
            console.log('Database tables initialized (SQLite).');
            resolve();
          });
        });
      });
    }
  }

  async run(sql, params = []) {
    if (this.type === 'postgres') {
      // Transform params for Postgres ($1, $2, etc)
      const transformedSql = this._transformQuery(sql);

      // Handle RETURNING ID for INSERTs to simulate SQLite lastID
      let finalSql = transformedSql;
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');

      if (isInsert && !transformedSql.toUpperCase().includes('RETURNING')) {
        finalSql += ' RETURNING id';
      }

      try {
        const res = await this.pool.query(finalSql, params);
        // Simulate SQLite result object
        const result = {
          changes: res.rowCount,
          lastID: (isInsert && res.rows.length > 0) ? res.rows[0].id : null,
          id: (isInsert && res.rows.length > 0) ? res.rows[0].id : null // Backwards compatibility if code uses result.id directly
        };
        return result;
      } catch (err) {
        console.error('SQL Error (Postgres):', err.message, finalSql, params);
        throw err;
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function (err) {
          if (err) {
            reject(err);
          } else {
            // Add 'id' property to match what we do for Postgres and likely assumed by some code
            resolve({ id: this.lastID, lastID: this.lastID, changes: this.changes });
          }
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.type === 'postgres') {
      const transformedSql = this._transformQuery(sql);
      try {
        const res = await this.pool.query(transformedSql, params);
        return res.rows[0];
      } catch (err) {
        console.error('SQL Error (Postgres):', err.message);
        throw err;
      }
    } else {
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
  }

  async all(sql, params = []) {
    if (this.type === 'postgres') {
      const transformedSql = this._transformQuery(sql);
      try {
        const res = await this.pool.query(transformedSql, params);
        return res.rows;
      } catch (err) {
        console.error('SQL Error (Postgres):', err.message);
        throw err;
      }
    } else {
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
  }

  close() {
    if (this.type === 'postgres') {
      return this.pool.end().then(() => console.log('PostgreSQL pool closed.'));
    } else {
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
}

module.exports = new Database();
