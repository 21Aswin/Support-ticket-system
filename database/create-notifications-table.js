require('../backend/node_modules/dotenv').config({ path: './backend/.env' });
const db = require('../backend/config/database');

async function run() {
  const sql = `
  CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
  `;

  await db.query(sql);
  console.log('Notifications table and indexes created successfully!');

  // Seed initial sample notifications for demonstration
  const check = await db.query('SELECT COUNT(*) FROM notifications');
  if (parseInt(check.rows[0].count, 10) === 0) {
    const seedNotifications = `
      INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
      VALUES 
        -- Notification for Support Staff Sarah Jenkins (user 2)
        (2, 1, 'ASSIGNMENT', 'New Ticket Assigned: HD-00101', 'Admin assigned you to ticket: Laptop cannot connect to office Wi-Fi', FALSE, NOW() - INTERVAL '1 day'),
        (2, 2, 'ASSIGNMENT', 'New Ticket Assigned: HD-00102', 'Admin assigned you to ticket: Email account access request', FALSE, NOW() - INTERVAL '2 days'),
        -- Notification for Employee John Doe (user 4)
        (4, 1, 'STATUS_CHANGE', 'Ticket Update: HD-00101', 'Your ticket has been assigned to Sarah Jenkins', FALSE, NOW() - INTERVAL '1 day'),
        (4, 4, 'RESOLUTION', 'Ticket Resolved: HD-00104', 'Sarah Jenkins resolved your ticket: Updated IPSec keys and verified VPN', FALSE, NOW() - INTERVAL '1 day');
    `;
    await db.query(seedNotifications);
    console.log('Seeded sample notifications.');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
