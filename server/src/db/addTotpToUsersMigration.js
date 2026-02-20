const db = require('./database');

async function addTotpToUsersMigration() {
    try {
        let userTableExists = false;
        if (db.type === 'postgres') {
            const row = await db.get("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");
            userTableExists = !!row;
        } else {
            const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
            userTableExists = !!row;
        }

        if (userTableExists) {
            let columnNames = [];

            if (db.type === 'postgres') {
                const columns = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
                columnNames = columns.map(col => col.column_name);
            } else {
                const columns = await db.all("PRAGMA table_info(users)");
                columnNames = columns.map(col => col.name);
            }

            if (!columnNames.includes('totpSecret')) { // Note: Postgres column names might be lowercase
                // Postgres is case-insensitive for unquoted identifiers, but information_schema usually returns lowercase
                // However, we created table with "totpSecret" which might become "totpsecret" in PG unless quoted.
                // Let's check case-insensitive match or just assume "totpsecret"

                // Better approach: check case-insensitively
                const lowerColumnNames = columnNames.map(c => c.toLowerCase());
                if (!lowerColumnNames.includes('totpsecret')) {
                    await db.run(`ALTER TABLE users ADD COLUMN "totpSecret" TEXT`);
                    console.log("Added totpSecret column to users table.");
                } else {
                    console.log("totpSecret column already exists in users table.");
                }
            } else {
                console.log("totpSecret column already exists in users table.");
            }

            // Check for is2faEnabled - handle case sensitivity
            const lowerColumnNames = columnNames.map(c => c.toLowerCase());
            if (!lowerColumnNames.includes('is2faenabled')) {
                await db.run(`ALTER TABLE users ADD COLUMN "is2faEnabled" INTEGER DEFAULT 0`);
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