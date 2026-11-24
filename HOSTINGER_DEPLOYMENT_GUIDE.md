# HelpDesk Support Ticket System - Hostinger Deployment Guide

This guide provides end-to-end instructions for deploying the **HelpDesk Support Ticket Management System** on **Hostinger**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          Domain / Visitor            │
                      └──────────────────┬───────────────────┘
                                         │
                         HTTPS (Port 443) / Port 80
                                         │
                                         ▼
                 ┌─────────────────────────────────────────────────┐
                 │       Hostinger Web Server (Apache / Nginx)     │
                 └───────┬─────────────────────────────────┬───────┘
                         │                                 │
     Standard Requests   │                                 │  /api/* (Reverse Proxy)
                         ▼                                 ▼
         ┌──────────────────────────────┐  cURL    ┌──────────────────────────────┐
         │ PHP 8.2+ Presentation Layer  │ ◄──────► │ Node.js Express REST API     │
         │ (frontend/ directory)        │          │ (backend/ server.js - :3000) │
         └──────────────────────────────┘          └──────────────┬───────────────┘
                                                                  │
                                                          pg Pool (SQL Queries)
                                                                  │
                                                                  ▼
                                                   ┌──────────────────────────────┐
                                                   │    PostgreSQL Database       │
                                                   │ (Hostinger VPS / Neon Cloud) │
                                                   └──────────────────────────────┘
```

---

## Choose Your Hostinger Hosting Plan

| Feature | Hostinger VPS (Ubuntu) ⭐ Recommended | Hostinger Web / Cloud Hosting (hPanel) |
| :--- | :--- | :--- |
| **Control** | Full root access (SSH, terminal) | Web-based hPanel dashboard |
| **Node.js** | Supported natively via PM2 | Supported on Business & Cloud via Node.js App Manager |
| **PostgreSQL**| Native local PostgreSQL or Cloud | Cloud PostgreSQL (Neon.tech or Supabase.com - Free) |
| **Performance**| Highest speed & isolation | Shared resource environment |

---

# OPTION 1: Hostinger VPS Deployment (Ubuntu 22.04 / 24.04)

### Step 1: Connect to your Hostinger VPS via SSH
```bash
ssh root@<YOUR_VPS_IP_ADDRESS>
```

### Step 2: Install System Dependencies
```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager globally
sudo npm install -g pm2

# Install PostgreSQL & Contrib
sudo apt install -y postgresql postgresql-contrib

# Install PHP 8.2 & Required Extensions
sudo apt install -y php8.2 php8.2-fpm php8.2-curl php8.2-mbstring php8.2-xml nginx git certbot python3-certbot-nginx
```

### Step 3: Configure PostgreSQL Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Run these SQL commands inside psql:
CREATE DATABASE helpdesk_db;
CREATE USER helpdesk_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE helpdesk_db TO helpdesk_user;
ALTER DATABASE helpdesk_db OWNER TO helpdesk_user;
\q
```

### Step 4: Clone / Upload the Project
```bash
# Place code in /var/www/helpdesk
sudo mkdir -p /var/www/helpdesk
cd /var/www/helpdesk

# Clone your repository (or upload via SFTP)
git clone <YOUR_GIT_REPO_URL> .

# Set correct permissions for web server
sudo chown -R www-data:www-data /var/www/helpdesk
sudo chmod -R 755 /var/www/helpdesk
```

### Step 5: Configure Backend & Initialize Database
```bash
cd /var/www/helpdesk/backend

# Install production dependencies
npm install --omit=dev

# Configure backend environment
cp .env.example .env
nano .env
```
Update your `.env` values:
```env
PORT=3000
NODE_ENV=production
TZ=Asia/Kolkata
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=helpdesk_db
DB_USER=helpdesk_user
DB_PASSWORD=YourStrongPassword123!
DB_SSL=false
JWT_SECRET=generate_a_random_64_character_string_here
JWT_EXPIRES_IN=24h
```

Now, initialize the database schema and default seeds:
```bash
cd /var/www/helpdesk
node database/init-db.js
```

### Step 6: Start Node.js API with PM2
```bash
cd /var/www/helpdesk
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 7: Configure Nginx & SSL
Copy the provided Nginx configuration:
```bash
sudo cp /var/www/helpdesk/nginx.conf.example /etc/nginx/sites-available/helpdesk
sudo nano /etc/nginx/sites-available/helpdesk
```
*(Replace `yourdomain.com` with your actual domain).*

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Install free Let's Encrypt SSL:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Your system is now live at `https://yourdomain.com`!

---

# OPTION 2: Hostinger Web / Cloud Hosting (hPanel)

If you have Hostinger Shared, Premium, or Business Web Hosting with **hPanel**:

### Step 1: Create a Free Cloud PostgreSQL Database
Since Hostinger Web Hosting includes MySQL but not native PostgreSQL, create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com):
1. Sign up on **Neon.tech** (Free Tier).
2. Create project: `helpdesk-db`.
3. Copy the **Connection String**:
   `postgresql://username:password@ep-sample-1234.ap-southeast-1.aws.neon.tech/helpdesk_db?sslmode=require`

### Step 2: Upload Files via File Manager or Git
1. Log in to **Hostinger hPanel**.
2. Open **File Manager** -> navigate to `public_html/`.
3. Upload the project files:
   - Option A: Upload all project files into `public_html/`.
   - Option B: Upload `frontend/` files directly into `public_html/` and keep `backend/` in a sibling folder (e.g. `/home/u123456789/backend`).

### Step 3: Configure Frontend API Endpoint
1. Go to `frontend/config/`.
2. Copy `env.example.php` to `env.php`.
3. Edit `env.php`:
```php
<?php
return [
    'HELPDESK_API_URL' => 'https://api.yourdomain.com', // Or your backend URL
    'APP_TIMEZONE' => 'Asia/Kolkata',
];
```

### Step 4: Configure Backend (Node.js Manager in hPanel)
1. In hPanel, search for **Node.js** in the left sidebar.
2. Click **Create Application**:
   - **Node.js version**: 20.x
   - **Application root**: `backend`
   - **Application startup file**: `server.js`
   - **Environment variables**:
     - `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
     - `DB_SSL`: `true`
     - `JWT_SECRET`: *(A long secure key)*
     - `TZ`: `Asia/Kolkata`
3. Click **Save & Restart**.

### Step 5: Run Database Migrations
On your local machine or terminal:
```bash
# Point DATABASE_URL to your live Neon database
export DATABASE_URL="postgresql://user:pass@ep-sample.aws.neon.tech/helpdesk_db?sslmode=require"
node database/init-db.js
```
All tables, users, sample categories, and indexes will be created instantly on the live database.

---

## Default Seed Accounts for Testing

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@helpdesk.local` | `Admin@123` |
| **Support Staff (Sarah)** | `support@helpdesk.local` | `Support@123` |
| **Support Staff (Alex)** | `alex.support@helpdesk.local` | `Support@123` |
| **Employee (John)** | `employee@helpdesk.local` | `Employee@123` |
| **Employee (Emily)** | `emily.emp@helpdesk.local` | `Employee@123` |

---

## Post-Deployment Verification Checklist

- [ ] Visit `https://yourdomain.com/login.php` - Brand logo and login form appear.
- [ ] Test password eye toggle button.
- [ ] Log in as `admin@helpdesk.local` - Admin dashboard KPIs and charts render.
- [ ] Check topbar time formatting displays `Asia/Kolkata` (IST, UTC+5:30).
- [ ] Create a ticket using employee account with AI Auto-Draft.
- [ ] Verify notification badge counter updates and decrements on click.
- [ ] Check mobile view (375px width) for zero horizontal overflow and responsive dropdowns.
