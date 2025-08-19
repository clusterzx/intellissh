const db = require('./database');

async function addTotpToUsersMigration() {
    try {
        const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");

        if (row) {
            const columns = await db.all("PRAGMA table_info(users)");
            const columnNames = columns.map(col => col.name);

            if (!columnNames.includes('totpSecret')) {
                await db.run(`ALTER TABLE users ADD COLUMN totpSecret TEXT`);
                console.log("Added totpSecret column to users table.");
            } else {
                console.log("totpSecret column already exists in users table.");
            }

            if (!columnNames.includes('is2faEnabled')) {
                await db.run(`ALTER TABLE users ADD COLUMN is2faEnabled INTEGER DEFAULT 0`);
                console.log("Added is2faEnabled column to users table.");
            } else {
                console.log("is2faEnabled column already exists in users table.");
            }
            console.log("TOTP columns migration check completed.");
        } else {
            console.log("Users table does not exist. Skipping totpSecret and is2faEnabled column migration.");
        }
    } catch (err) {
        console.error("Error in addTotpToUsersMigration:", err.message);
        throw err; // Re-throw to ensure it's caught by runMigration's catch block
    }
}

module.exports = addTotpToUsersMigration;