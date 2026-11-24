<?php
/**
 * HelpDesk Production Environment Configuration
 * 
 * For Hostinger deployment:
 * 1. Rename or copy this file to: env.php (in the same frontend/config/ directory).
 * 2. Update the HELPDESK_API_URL to point to your live Node.js REST API.
 *    - If running backend on the same server: 'http://127.0.0.1:3000'
 *    - If using a subdomain: 'https://api.yourdomain.com'
 *    - If running on cloud: 'https://your-backend-app.onrender.com'
 */

return [
    // Live Node.js Express REST API URL
    'HELPDESK_API_URL' => 'http://127.0.0.1:3000',

    // Application Timezone (Defaults to Asia/Kolkata for IST)
    'APP_TIMEZONE' => 'Asia/Kolkata',
];
