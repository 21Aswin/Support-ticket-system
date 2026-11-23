require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const db = require('../backend/config/database');

async function run() {
  const sql = `
  CREATE TABLE IF NOT EXISTS password_resets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
  CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
  `;

  await db.query(sql);
  console.log('password_resets table and indexes created successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
