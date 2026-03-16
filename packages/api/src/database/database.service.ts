import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

export interface QueryParams {
  [key: string]: any;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private sql: any;

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      this.sql = neon(databaseUrl);
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables() {
    // Customer table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        operator TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);

    // Account table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        platform_name TEXT,
        uuid TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_login_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status)`);

    // Salon table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS salons (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        subdomain TEXT NOT NULL UNIQUE,
        custom_domain TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        industry TEXT NOT NULL DEFAULT 'beauty',
        currency TEXT NOT NULL DEFAULT 'USD',
        timezone TEXT NOT NULL DEFAULT 'America/New_York',
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        country TEXT NOT NULL DEFAULT 'US',
        latitude REAL,
        longitude REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_salons_account_id ON salons(account_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status)`);

    // BusinessHour table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS business_hours (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL,
        is_closed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        UNIQUE(salon_id, day_of_week)
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_business_hours_salon_id ON business_hours(salon_id)`);

    // SpecialHour table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS special_hours (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        date TEXT NOT NULL,
        is_closed INTEGER NOT NULL DEFAULT 0,
        open_time TEXT,
        close_time TEXT,
        label TEXT,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        UNIQUE(salon_id, date)
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_special_hours_salon_id ON special_hours(salon_id)`);

    // Staff table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        account_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL,
        gender TEXT,
        avatar_url TEXT,
        bio TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_salon_id ON staff(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_account_id ON staff(account_id)`);

    // StaffWorkHour table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS staff_work_hours (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_off INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        UNIQUE(staff_id, day_of_week)
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_work_hours_staff_id ON staff_work_hours(staff_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_work_hours_salon_id ON staff_work_hours(salon_id)`);

    // ServiceCategory table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_service_categories_salon_id ON service_categories(salon_id)`);

    // Service table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        pos_price REAL,
        tech_count INTEGER NOT NULL DEFAULT 1,
        cover_image_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_multi_tech INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        pricing_variants TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id)`);

    // ServiceAddon table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS service_addons (
        id TEXT PRIMARY KEY,
        service_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_service_addons_service_id ON service_addons(service_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_service_addons_salon_id ON service_addons(salon_id)`);

    // StaffService table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS staff_services (
        staff_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        PRIMARY KEY (staff_id, service_id),
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_staff_services_salon_id ON staff_services(salon_id)`);

    // Client table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL,
        email TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        source TEXT NOT NULL DEFAULT 'WEBSITE',
        total_visits INTEGER NOT NULL DEFAULT 0,
        last_visit_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        UNIQUE(salon_id, phone)
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_clients_salon_id ON clients(salon_id)`);

    // Appointment table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        source TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        total_price REAL,
        total_duration INTEGER,
        tip REAL NOT NULL DEFAULT 0,
        notes TEXT,
        internal_notes TEXT,
        cancelled_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)`);

    // AppointmentService table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS appointment_services (
        id TEXT PRIMARY KEY,
        appointment_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        addons TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id ON appointment_services(appointment_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id ON appointment_services(service_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointment_services_staff_id ON appointment_services(staff_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_appointment_services_salon_id ON appointment_services(salon_id)`);

    // TimeBlock table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS time_blocks (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_time_blocks_salon_id ON time_blocks(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_time_blocks_staff_id ON time_blocks(staff_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(date)`);

    // GiftCardProduct table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS gift_card_products (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        face_value REAL,
        service_count INTEGER,
        linked_service_id TEXT,
        cover_image_url TEXT,
        validity_days INTEGER,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (linked_service_id) REFERENCES services(id) ON DELETE SET NULL
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_products_salon_id ON gift_card_products(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_products_linked_service_id ON gift_card_products(linked_service_id)`);

    // GiftCardInstance table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS gift_card_instances (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        serial_no TEXT NOT NULL UNIQUE,
        recipient_name TEXT,
        recipient_phone TEXT,
        sender_name TEXT,
        message TEXT,
        original_value REAL NOT NULL,
        remaining_value REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        issued_at TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES gift_card_products(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_instances_salon_id ON gift_card_instances(salon_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_instances_product_id ON gift_card_instances(product_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_instances_status ON gift_card_instances(status)`);

    // GiftCardUsageLog table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS gift_card_usage_logs (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        amount REAL NOT NULL,
        operator_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (instance_id) REFERENCES gift_card_instances(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
        FOREIGN KEY (operator_id) REFERENCES staff(id) ON DELETE SET NULL
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_usage_logs_instance_id ON gift_card_usage_logs(instance_id)`);
    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_usage_logs_salon_id ON gift_card_usage_logs(salon_id)`);

    // Gift card categories table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS gift_card_categories (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_categories_salon_id ON gift_card_categories(salon_id)`);

    // Extend gift_card_products with category, font_color, is_listed
    try { await this.exec(`ALTER TABLE gift_card_products ADD COLUMN IF NOT EXISTS category_id TEXT`); } catch {}
    try { await this.exec(`ALTER TABLE gift_card_products ADD COLUMN IF NOT EXISTS font_color TEXT DEFAULT '#FFFFFF'`); } catch {}
    try { await this.exec(`ALTER TABLE gift_card_products ADD COLUMN IF NOT EXISTS is_listed INTEGER NOT NULL DEFAULT 0`); } catch {}

    // Gift card product items (for item-type cards linking to services)
    await this.exec(`
      CREATE TABLE IF NOT EXISTS gift_card_product_items (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        salon_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (product_id) REFERENCES gift_card_products(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_gift_card_product_items_product_id ON gift_card_product_items(product_id)`);

    // Extend gift_card_instances with buyer_client_id and remaining_items for item cards
    try { await this.exec(`ALTER TABLE gift_card_instances ADD COLUMN IF NOT EXISTS buyer_client_id TEXT`); } catch {}
    try { await this.exec(`ALTER TABLE gift_card_instances ADD COLUMN IF NOT EXISTS remaining_items TEXT DEFAULT '[]'`); } catch {}

    // Extend gift_card_usage_logs with service tracking for item redemptions
    try { await this.exec(`ALTER TABLE gift_card_usage_logs ADD COLUMN IF NOT EXISTS service_id TEXT`); } catch {}
    try { await this.exec(`ALTER TABLE gift_card_usage_logs ADD COLUMN IF NOT EXISTS item_quantity INTEGER`); } catch {}
    try { await this.exec(`ALTER TABLE gift_card_usage_logs ADD COLUMN IF NOT EXISTS redemption_type TEXT DEFAULT 'AMOUNT'`); } catch {}

    // WebsiteConfig table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL UNIQUE,
        theme TEXT NOT NULL DEFAULT '{}',
        navbar TEXT NOT NULL DEFAULT '{}',
        announcement TEXT,
        hero TEXT,
        sections TEXT NOT NULL DEFAULT '[]',
        footer TEXT,
        service_page TEXT,
        seo TEXT,
        published_at TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    // MediaFile table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL,
        folder TEXT NOT NULL DEFAULT '/',
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);

    await this.exec(`CREATE INDEX IF NOT EXISTS idx_media_files_salon_id ON media_files(salon_id)`);

    // BookingSettings table
    await this.exec(`
      CREATE TABLE IF NOT EXISTS booking_settings (
        id TEXT PRIMARY KEY,
        salon_id TEXT NOT NULL UNIQUE,
        buffer_minutes INTEGER NOT NULL DEFAULT 0,
        min_advance_minutes INTEGER NOT NULL DEFAULT 60,
        reminder_before TEXT NOT NULL DEFAULT '[]',
        allow_multi_service INTEGER NOT NULL DEFAULT 0,
        allow_multi_person INTEGER NOT NULL DEFAULT 0,
        sms_verification INTEGER NOT NULL DEFAULT 0,
        notification_phone TEXT,
        notification_email TEXT,
        assignment_strategy TEXT NOT NULL DEFAULT 'COUNT',
        allow_gender_filter INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Convert ? placeholders to $1, $2, $3, ... for PostgreSQL
   */
  private convertPlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  /**
   * Execute a SQL statement without returning results (raw DDL)
   */
  async exec(sql: string): Promise<void> {
    try {
      await this.sql(sql);
    } catch (error) {
      console.error('SQL exec error:', error, 'SQL:', sql);
      throw error;
    }
  }

  /**
   * Run a SQL statement with parameters
   */
  async run(sql: string, params?: any[]): Promise<void> {
    try {
      const pgSql = this.convertPlaceholders(sql);
      await this.sql(pgSql, params || []);
    } catch (error) {
      console.error('SQL run error:', error, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  }

  /**
   * Get a single row from a query
   */
  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    try {
      const pgSql = this.convertPlaceholders(sql);
      const rows = await this.sql(pgSql, params || []);
      return rows[0] as T | undefined;
    } catch (error) {
      console.error('SQL get error:', error, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  }

  /**
   * Get all rows from a query
   */
  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const pgSql = this.convertPlaceholders(sql);
      const rows = await this.sql(pgSql, params || []);
      return rows as T[];
    } catch (error) {
      console.error('SQL all error:', error, 'SQL:', sql, 'Params:', params);
      throw error;
    }
  }

  /**
   * Generate UUID
   */
  generateId(): string {
    return randomUUID();
  }

  /**
   * Get database stats
   */
  getStats(): { isInitialized: boolean } {
    return {
      isInitialized: true,
    };
  }
}
