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

  /**
   * POST /seed-demo
   * Seed demo services, categories, staff, and staff-service mappings
   */
  @Post('seed-demo')
  async seedDemo() {
    const salon = await this.db.get<any>(`SELECT id FROM salons WHERE subdomain = ?`, ['serenity']);
    if (!salon) {
      return { message: 'Salon not found. Run /seed first.', seeded: false };
    }
    const salonId = salon.id;

    const existingCat = await this.db.get('SELECT id FROM service_categories WHERE salon_id = ?', [salonId]);
    if (existingCat) {
      return { message: 'Demo data already seeded', seeded: false };
    }

    const now = new Date().toISOString();

    // Service Categories
    const catNails = randomUUID();
    const catHair = randomUUID();
    const catSkin = randomUUID();
    const catLash = randomUUID();

    const categories = [
      { id: catNails, name: 'Nail Services', sortOrder: 1 },
      { id: catHair, name: 'Hair Services', sortOrder: 2 },
      { id: catSkin, name: 'Skin Care', sortOrder: 3 },
      { id: catLash, name: 'Lash & Brow', sortOrder: 4 },
    ];

    for (const cat of categories) {
      await this.db.run(
        `INSERT INTO service_categories (id, salon_id, name, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [cat.id, salonId, cat.name, cat.sortOrder, 1, now],
      );
    }

    // Services
    const services = [
      { id: randomUUID(), catId: catNails, name: 'Classic Manicure', desc: 'Nail shaping, cuticle care, hand massage, and polish', price: 35, duration: 30, sort: 1 },
      { id: randomUUID(), catId: catNails, name: 'Gel Manicure', desc: 'Long-lasting gel polish with UV cure, includes cuticle care', price: 50, duration: 45, sort: 2 },
      { id: randomUUID(), catId: catNails, name: 'Classic Pedicure', desc: 'Foot soak, nail shaping, callus removal, and polish', price: 45, duration: 45, sort: 3 },
      { id: randomUUID(), catId: catNails, name: 'Deluxe Pedicure', desc: 'Full pedicure with hot stone massage and paraffin treatment', price: 65, duration: 60, sort: 4 },
      { id: randomUUID(), catId: catNails, name: 'Nail Art (per nail)', desc: 'Custom nail art design per nail', price: 8, duration: 10, sort: 5 },
      { id: randomUUID(), catId: catHair, name: "Women's Haircut", desc: 'Wash, cut, and blowdry', price: 65, duration: 60, sort: 1 },
      { id: randomUUID(), catId: catHair, name: "Men's Haircut", desc: "Classic men's cut with styling", price: 35, duration: 30, sort: 2 },
      { id: randomUUID(), catId: catHair, name: 'Balayage', desc: 'Hand-painted highlights for a natural, sun-kissed look', price: 180, duration: 150, sort: 3 },
      { id: randomUUID(), catId: catHair, name: 'Blowout & Style', desc: 'Professional blowdry and styling', price: 45, duration: 45, sort: 4 },
      { id: randomUUID(), catId: catSkin, name: 'Classic Facial', desc: 'Deep cleansing, exfoliation, and hydration', price: 85, duration: 60, sort: 1 },
      { id: randomUUID(), catId: catSkin, name: 'Anti-Aging Facial', desc: 'Targeted treatment with retinol and peptides', price: 120, duration: 75, sort: 2 },
      { id: randomUUID(), catId: catSkin, name: 'Chemical Peel', desc: 'Professional-grade exfoliation for skin renewal', price: 95, duration: 45, sort: 3 },
      { id: randomUUID(), catId: catLash, name: 'Lash Extensions - Classic', desc: 'Individual lash extensions for a natural look', price: 150, duration: 120, sort: 1 },
      { id: randomUUID(), catId: catLash, name: 'Lash Extensions - Volume', desc: 'Full volume lash fans for a dramatic look', price: 200, duration: 150, sort: 2 },
      { id: randomUUID(), catId: catLash, name: 'Brow Shaping', desc: 'Professional brow wax and tint', price: 30, duration: 20, sort: 3 },
    ];

    for (const svc of services) {
      await this.db.run(
        `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [svc.id, salonId, svc.catId, svc.name, svc.desc, svc.price, svc.duration, 1, svc.sort, now, now],
      );
    }

    // Service Addons
    const gelManicure = services.find(s => s.name === 'Gel Manicure')!;
    const deluxePedi = services.find(s => s.name === 'Deluxe Pedicure')!;
    const classicFacial = services.find(s => s.name === 'Classic Facial')!;

    const addons = [
      { serviceId: gelManicure.id, name: 'Chrome Finish', price: 15, duration: 10, sort: 1 },
      { serviceId: gelManicure.id, name: 'French Tips', price: 10, duration: 10, sort: 2 },
      { serviceId: deluxePedi.id, name: 'Aromatherapy Upgrade', price: 15, duration: 10, sort: 1 },
      { serviceId: classicFacial.id, name: 'LED Light Therapy', price: 25, duration: 15, sort: 1 },
      { serviceId: classicFacial.id, name: 'Collagen Mask', price: 20, duration: 10, sort: 2 },
    ];

    for (const addon of addons) {
      await this.db.run(
        `INSERT INTO service_addons (id, service_id, salon_id, name, price, duration, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), addon.serviceId, salonId, addon.name, addon.price, addon.duration, addon.sort],
      );
    }

    // Staff Members
    const staffMembers = [
      { id: randomUUID(), name: 'Emily Chen', role: 'TECHNICIAN', gender: 'FEMALE', bio: 'Senior nail technician with 8 years of experience. Specializes in nail art and gel extensions.' },
      { id: randomUUID(), name: 'Sarah Johnson', role: 'TECHNICIAN', gender: 'FEMALE', bio: 'Licensed esthetician passionate about skincare. Expert in anti-aging treatments.' },
      { id: randomUUID(), name: 'Mike Rodriguez', role: 'TECHNICIAN', gender: 'MALE', bio: 'Award-winning hair stylist with a passion for creative color techniques.' },
      { id: randomUUID(), name: 'Lisa Wang', role: 'TECHNICIAN', gender: 'FEMALE', bio: 'Certified lash artist. Trained in both classic and volume techniques.' },
      { id: randomUUID(), name: 'Jessica Park', role: 'RECEPTIONIST', gender: 'FEMALE', bio: 'Versatile stylist skilled in both hair and nail services.' },
    ];

    for (let i = 0; i < staffMembers.length; i++) {
      const s = staffMembers[i];
      await this.db.run(
        `INSERT INTO staff (id, salon_id, name, role, gender, bio, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, salonId, s.name, s.role, s.gender, s.bio, 1, i + 1, now, now],
      );
    }

    // Staff Work Hours (Mon-Sat working, Sun off)
    for (const s of staffMembers) {
      for (let day = 0; day < 7; day++) {
        const isOff = day === 0 ? 1 : 0;
        await this.db.run(
          `INSERT INTO staff_work_hours (id, staff_id, salon_id, day_of_week, start_time, end_time, is_off) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (staff_id, day_of_week) DO NOTHING`,
          [randomUUID(), s.id, salonId, day, '09:00', '18:00', isOff],
        );
      }
    }

    // Staff-Service Mappings
    const nailServices = services.filter(s => s.catId === catNails);
    const skinServices = services.filter(s => s.catId === catSkin);
    const hairServices = services.filter(s => s.catId === catHair);
    const lashServices = services.filter(s => s.catId === catLash);

    // Emily: nails, Sarah: skin, Mike: hair, Lisa: lash, Jessica: nails+hair
    const staffServiceMap = [
      { staff: staffMembers[0], services: nailServices },
      { staff: staffMembers[1], services: skinServices },
      { staff: staffMembers[2], services: hairServices },
      { staff: staffMembers[3], services: lashServices },
      { staff: staffMembers[4], services: [...nailServices, ...hairServices] },
    ];

    for (const mapping of staffServiceMap) {
      for (const svc of mapping.services) {
        await this.db.run(
          `INSERT INTO staff_services (staff_id, service_id, salon_id) VALUES (?, ?, ?) ON CONFLICT (staff_id, service_id) DO NOTHING`,
          [mapping.staff.id, svc.id, salonId],
        );
      }
    }

    // Update Sunday hours to open 10-16
    await this.db.run(
      `UPDATE business_hours SET open_time = ?, close_time = ?, is_closed = ? WHERE salon_id = ? AND day_of_week = ?`,
      ['10:00', '16:00', 0, salonId, 0],
    );

    return {
      message: 'Demo data seeded successfully',
      seeded: true,
      data: { categories: categories.length, services: services.length, addons: addons.length, staff: staffMembers.length },
    };
  }
}
