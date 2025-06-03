const db = require('./database');

async function addCustomApiSettings() {
  try {
    console.log('Starting Custom API settings migration');
    
    // Check if custom API settings already exist
    const customApiUrlSetting = await db.get('SELECT id FROM settings WHERE id = ?', ['custom_api_url']);
    const customApiKeySetting = await db.get('SELECT id FROM settings WHERE id = ?', ['custom_api_key']);
    const customModelSetting = await db.get('SELECT id FROM settings WHERE id = ?', ['custom_model']);
    
    // Insert settings that don't exist
    if (!customApiUrlSetting) {
      console.log('Adding custom_api_url setting');
      await db.run(
        'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
        ['custom_api_url', 'Custom API URL', '', 'llm', 'Base URL for custom OpenAI-compatible API', 0]
      );
    } else {
      console.log('custom_api_url setting already exists');
    }
    
    if (!customApiKeySetting) {
      console.log('Adding custom_api_key setting');
      await db.run(
        'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
        ['custom_api_key', 'Custom API Key', '', 'llm', 'API key for custom OpenAI-compatible API', 1]
      );
    } else {
      console.log('custom_api_key setting already exists');
    }
    
    if (!customModelSetting) {
      console.log('Adding custom_model setting');
      await db.run(
        'INSERT INTO settings (id, name, value, category, description, is_sensitive) VALUES (?, ?, ?, ?, ?, ?)',
        ['custom_model', 'Custom Model', 'gpt-3.5-turbo', 'llm', 'Model name for custom API', 0]
      );
    } else {
      console.log('custom_model setting already exists');
    }
    
    console.log('Custom API settings migration completed successfully');
    return true;
  } catch (error) {
    console.error('Custom API settings migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(addCustomApiSettings)
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { addCustomApiSettings };
