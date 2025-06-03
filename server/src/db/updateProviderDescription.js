/**
 * Script to update the llm_provider description to include 'custom' option
 */

const db = require('./database');

async function updateProviderDescription() {
  try {
    console.log('Updating LLM provider description...');
    
    await db.run(
      'UPDATE settings SET description = ? WHERE id = ?',
      ['LLM provider (openai, ollama, or custom)', 'llm_provider']
    );
    
    const setting = await db.get('SELECT * FROM settings WHERE id = ?', ['llm_provider']);
    console.log('Updated description:', setting.description);
    
    console.log('Update completed successfully');
  } catch (error) {
    console.error('Update failed:', error);
  }
}

// Run the update
db.connect()
  .then(updateProviderDescription)
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
