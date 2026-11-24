const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Client } = require('../backend/node_modules/pg');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || undefined,
};

async function run() {
  let dbClient;

  if (process.env.DATABASE_URL) {
    console.log(`Connecting to PostgreSQL via DATABASE_URL...`);
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
    await dbClient.connect();
    console.log("Connected to target database successfully.");
  } else {
    console.log(`Connecting to PostgreSQL at ${config.host}:${config.port} as ${config.user}...`);
    
    // Step 1: Connect to default postgres DB to create helpdesk_db if needed
    try {
      const adminClient = new Client({ ...config, database: 'postgres' });
      await adminClient.connect();

      const checkDb = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = 'helpdesk_db'"
      );

      if (checkDb.rows.length === 0) {
        console.log("Database 'helpdesk_db' does not exist. Creating...");
        await adminClient.query("CREATE DATABASE helpdesk_db;");
        console.log("Database 'helpdesk_db' created successfully.");
      } else {
        console.log("Database 'helpdesk_db' already exists.");
      }
      await adminClient.end();
    } catch (err) {
      console.warn("Could not check/create database via postgres admin (continuing):", err.message);
    }

    // Step 2: Connect to helpdesk_db
    dbClient = new Client({
      ...config,
      database: process.env.DB_NAME || 'helpdesk_db',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    await dbClient.connect();
    console.log(`Connected to '${process.env.DB_NAME || 'helpdesk_db'}'.`);
  }

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log("Executing schema.sql...");
  await dbClient.query(schemaSql);
  console.log("schema.sql executed successfully.");

  const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  console.log("Executing seed.sql...");
  await dbClient.query(seedSql);
  console.log("seed.sql executed successfully.");

  // Step 3: Verify counts
  const usersCount = await dbClient.query("SELECT COUNT(*) FROM users;");
  const ticketsCount = await dbClient.query("SELECT COUNT(*) FROM tickets;");
  const categoriesCount = await dbClient.query("SELECT COUNT(*) FROM ticket_categories;");
  const historyCount = await dbClient.query("SELECT COUNT(*) FROM ticket_history;");
  const commentsCount = await dbClient.query("SELECT COUNT(*) FROM ticket_comments;");

  console.log("\n================ Database Verification ================");
  console.log(`Users:       ${usersCount.rows[0].count}`);
  console.log(`Categories:  ${categoriesCount.rows[0].count}`);
  console.log(`Tickets:     ${ticketsCount.rows[0].count}`);
  console.log(`Comments:    ${commentsCount.rows[0].count}`);
  console.log(`Audit Logs:  ${historyCount.rows[0].count}`);
  console.log("=======================================================\n");

  await dbClient.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
