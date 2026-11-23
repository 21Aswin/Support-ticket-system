require('dotenv').config();
const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

// Test database connection before listening
db.query('SELECT NOW()')
  .then((res) => {
    console.log(`[Database] PostgreSQL connected successfully at ${res.rows[0].now}`);
    const server = app.listen(PORT, () => {
      console.log(`[HelpDesk API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[HelpDesk API] Base URL: http://localhost:${PORT}/api`);
    });

    const shutdown = () => {
      console.log('\n[HelpDesk API] Shutting down gracefully...');
      server.close(() => {
        db.pool.end(() => {
          console.log('[Database] PostgreSQL pool drained.');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('[Database] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });
