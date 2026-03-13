import { Controller, Get, Post, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Controller()
export class AppController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'beauty-booking-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('seed')
  async seed() {
    // Check if already seeded
    const existing = await this.db.get('SELECT id FROM customers LIMIT 1');
    if (existing) {
      return { message: 'Database already seeded', seeded: false };
    }

    const now = new Date().toISOString();

    // 1. Create a Customer
    const customerId = randomUUID();
    await this.db.run(
      `INSERT INTO customers (id, name, phone, email, operator, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [customerId, 'Serenity Spa Group', '555-0100', 'info@serenityspa.com', 'system-seed', now, now],
    );

    // 2. Create an Account
    const accountId = randomUUID();
    const passwordHash = bcrypt.hashSync('admin123', 10);
    await this.db.run(
      `INSERT INTO accounts (id, customer_id, username, password_hash, platform_name, uuid, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [accountId, customerId, 'serenity_admin', passwordHash, 'Serenity Spa', randomUUID(), 'ACTIVE', now, now],
    );

    // 3. Create a Salon
    const salonId = randomUUID();
    await this.db.run(
      `INSERT INTO salons (id, account_id, name, subdomain, status, industry, currency, timezone, phone, email, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [salonId, accountId, 'Serenity Nail Spa', 'serenity', 'ACTIVE', 'beauty', 'USD', 'America/New_York', '555-0101', 'hello@serenity.com', 'US', now, now],
    );

    // 4. Create default business hours (Mon-Sat 9-18, Sun closed)
    for (let i = 0; i < 7; i++) {
      const isClosed = i === 6 ? 1 : 0;
      await this.db.run(
        `INSERT INTO business_hours (id, salon_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (salon_id, day_of_week) DO NOTHING`,
        [randomUUID(), salonId, i, '09:00', '18:00', isClosed],
      );
    }

    // 5. Create default booking settings
    await this.db.run(
      `INSERT INTO booking_settings (id, salon_id, buffer_minutes, min_advance_minutes, reminder_before, allow_multi_service, allow_multi_person, sms_verification, assignment_strategy, allow_gender_filter, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [randomUUID(), salonId, 0, 60, '[]', 0, 0, 0, 'COUNT', 0, now],
    );

    // 6. Create default website config
    await this.db.run(
      `INSERT INTO website_configs (id, salon_id, theme, navbar, sections, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [randomUUID(), salonId, '{}', '{}', '[]', now],
    );

    // 7. Create owner staff record
    const staffId = randomUUID();
    await this.db.run(
      `INSERT INTO staff (id, salon_id, account_id, name, role, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [staffId, salonId, accountId, 'Serenity Admin', 'OWNER', 1, 0, now, now],
    );

    // 8. Create platform admin account
    const platformCustomerId = randomUUID();
    const platformAccountId = randomUUID();
    const platformPasswordHash = bcrypt.hashSync('platform123', 10);
    await this.db.run(
      `INSERT INTO customers (id, name, phone, email, operator, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [platformCustomerId, 'Platform Operations', '555-0000', 'platform@beautybooking.com', 'system-seed', now, now],
    );
    await this.db.run(
      `INSERT INTO accounts (id, customer_id, username, password_hash, platform_name, uuid, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [platformAccountId, platformCustomerId, 'platform_admin', platformPasswordHash, 'Platform Admin', randomUUID(), 'ACTIVE', now, now],
    );

    // 9. Create platform admin staff record (needed for auth)
    const platformStaffId = randomUUID();
    await this.db.run(
      `INSERT INTO staff (id, salon_id, account_id, name, role, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [platformStaffId, salonId, platformAccountId, 'Platform Admin', 'OWNER', 1, 0, now, now],
    );

    return {
      message: 'Database seeded successfully',
      seeded: true,
      credentials: {
        merchant: { username: 'serenity_admin', password: 'admin123' },
        platform: { username: 'platform_admin', password: 'platform123' },
      },
    };
  }

  /**
   * POST /fix-platform-staff
   * One-time fix: create missing staff record for platform_admin account
   */
  @Post('fix-platform-staff')
  async fixPlatformStaff() {
    // Find the platform_admin account
    const account = await this.db.get<any>(
      `SELECT a.id as account_id, a.username FROM accounts a WHERE a.username = ?`,
      ['platform_admin'],
    );

    if (!account) {
      return { message: 'platform_admin account not found', fixed: false };
    }

    // Check if staff record already exists
    const existingStaff = await this.db.get<any>(
      `SELECT id FROM staff WHERE account_id = ?`,
      [account.account_id],
    );

    if (existingStaff) {
      return { message: 'Staff record already exists', fixed: false, staffId: existingStaff.id };
    }

    // Get any salon to associate with (use the first one)
    const salon = await this.db.get<any>(`SELECT id FROM salons LIMIT 1`);
    const salonId = salon?.id || randomUUID();

    const now = new Date().toISOString();
    const staffId = randomUUID();

    await this.db.run(
      `INSERT INTO staff (id, salon_id, account_id, name, role, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [staffId, salonId, account.account_id, 'Platform Admin', 'OWNER', 1, 0, now, now],
    );

    return { message: 'Staff record created for platform_admin', fixed: true, staffId };
  }
}
