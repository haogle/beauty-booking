/**
 * Seed script: Creates a platform admin + sample customer/account/salon
 * Run: npx ts-node src/seed.ts
 */
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'beauty_booking.db');
  let db: any;

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    console.error('Database file not found. Start the server first to create tables.');
    process.exit(1);
  }

  const now = new Date().toISOString();

  // 1. Create a Customer
  const customerId = randomUUID();
  await db.run(
    `INSERT INTO customers (id, name, phone, email, operator, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [customerId, 'Serenity Spa Group', '555-0100', 'info@serenityspa.com', 'system-seed', now, now]
  );
  console.log(`Customer created: ${customerId}`);

  // 2. Create an Account
  const accountId = randomUUID();
  const passwordHash = bcrypt.hashSync('admin123', 10);
  await db.run(
    `INSERT INTO accounts (id, customer_id, username, password_hash, platform_name, uuid, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [accountId, customerId, 'serenity_admin', passwordHash, 'Serenity Spa', randomUUID(), 'ACTIVE', now, now]
  );
  console.log(`Account created: ${accountId} (username: serenity_admin, password: admin123)`);

  // 3. Create a Salon
  const salonId = randomUUID();
  await db.run(
    `INSERT INTO salons (id, account_id, name, subdomain, status, industry, currency, timezone, phone, email, country, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [salonId, accountId, 'Serenity Nail Spa', 'serenity', 'ACTIVE', 'beauty', 'USD', 'America/New_York', '555-0101', 'hello@serenity.com', 'US', now, now]
  );
  console.log(`Salon created: ${salonId} (subdomain: serenity)`);

  // 4. Create default business hours (Mon-Sat 9-18, Sun closed)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < 7; i++) {
    const isClosed = i === 6 ? 1 : 0; // Sunday closed
    await db.run(
      `INSERT INTO business_hours (id, salon_id, day_of_week, open_time, close_time, is_closed)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [randomUUID(), salonId, i, '09:00', '18:00', isClosed]
    );
  }
  console.log('Business hours created (Mon-Sat 9-18, Sun closed)');

  // 5. Create default booking settings
  await db.run(
    `INSERT INTO booking_settings (id, salon_id, buffer_minutes, min_advance_minutes, reminder_before, allow_multi_service, allow_multi_person, sms_verification, assignment_strategy, allow_gender_filter, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [randomUUID(), salonId, 0, 60, '[]', 0, 0, 0, 'COUNT', 0, now]
  );
  console.log('Booking settings created');

  // 6. Create default website config
  await db.run(
    `INSERT INTO website_configs (id, salon_id, theme, navbar, sections, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [randomUUID(), salonId, '{}', '{}', '[]', now]
  );
  console.log('Website config created');

  // 7. Create owner staff record
  const staffId = randomUUID();
  await db.run(
    `INSERT INTO staff (id, salon_id, account_id, name, role, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    [staffId, salonId, accountId, 'Serenity Admin', 'OWNER', 1, 0, now, now]
  );
  console.log(`Staff (OWNER) created: ${staffId}`);

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('\nSeed complete! You can now login with:');
  console.log('  POST /api/v1/merchant/auth/login');
  console.log('  {"username": "serenity_admin", "password": "admin123"}');
}

seed().catch(console.error);
