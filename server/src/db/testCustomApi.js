/**
 * Test script for custom API settings
 * This script will:
 * 1. Connect to the database
 * 2. Run the custom API settings migration
 * 3. Verify that the settings exist
 */

const db = require('./database');
const { addCustomApiSettings } = require('./customApiMigration');

async function testCustomApiSettings() {
  try {
    console.log('Starting custom API settings test');
    
    // Run the migration
    await addCustomApiSettings();
    
    // Verify the settings exist
    const customApiUrl = await db.get('SELECT * FROM settings WHERE id = ?', ['custom_api_url']);
    const customApiKey = await db.get('SELECT * FROM settings WHERE id = ?', ['custom_api_key']);
    const customModel = await db.get('SELECT * FROM settings WHERE id = ?', ['custom_model']);
    
    console.log('Custom API URL setting:', customApiUrl ? 'Found' : 'Not found');
    console.log('Custom API Key setting:', customApiKey ? 'Found' : 'Not found');
    console.log('Custom Model setting:', customModel ? 'Found' : 'Not found');
    
    // Verify llm_provider has custom as a valid option
    const llmProvider = await db.get('SELECT * FROM settings WHERE id = ?', ['llm_provider']);
    console.log('LLM Provider description:', llmProvider.description);
    
    console.log('Test completed successfully');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  db.connect()
    .then(testCustomApiSettings)
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Test error:', err);
      process.exit(1);
    });
}

module.exports = { testCustomApiSettings };
