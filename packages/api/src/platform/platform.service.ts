import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateSalonDto } from './dto/create-salon.dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class PlatformService {
  constructor(private db: DatabaseService) {}

  // ============================================================================
  // CUSTOMER CRUD
  // ============================================================================

  async listCustomers(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM customers';
    let dataSql = `
      SELECT c.id, c.name, c.phone, c.email, c.operator, c.notes,
             c.created_at, c.updated_at
      FROM customers c
    `;
    const params: any[] = [];

    if (search) {
      const searchTerm = `%${search}%`;
      countSql += ` WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?`;
      dataSql += ` WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    dataSql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, skip);

    const countParams = search
      ? [`%${search}%`, `%${search}%`, `%${search}%`]
      : [];
    const countResult = await this.db.get<{ count: number }>(countSql, countParams);
    const total = countResult?.count || 0;

    const customers = await this.db.all<any>(dataSql, params);

    // Fetch account counts for each customer
    const dataWithCounts = [];
    for (const customer of customers) {
      const accountCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM accounts WHERE customer_id = ?',
        [customer.id],
      );
      dataWithCounts.push({
        ...customer,
        accountCount: accountCount?.count || 0,
      });
    }

    return {
      data: dataWithCounts,
      total,
      page,
      pageSize,
    };
  }

  async getCustomer(id: string): Promise<any> {
    const customer = await this.db.get<any>(
      'SELECT * FROM customers WHERE id = ?',
      [id],
    );

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    const accountCountResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM accounts WHERE customer_id = ?',
      [id],
    );

    return {
      ...customer,
      accountCount: accountCountResult?.count || 0,
    };
  }

  async createCustomer(dto: CreateCustomerDto): Promise<any> {
    const id = this.db.generateId();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO customers (id, name, phone, email, operator, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.phone || null,
        dto.email || null,
        dto.operator || null,
        dto.notes || null,
        now,
        now,
      ],
    );

    const customer = await this.db.get<any>(
      'SELECT * FROM customers WHERE id = ?',
      [id],
    );

    return {
      ...customer,
      accountCount: 0,
    };
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto): Promise<any> {
    const exists = await this.db.get(
      'SELECT * FROM customers WHERE id = ?',
      [id],
    );
    if (!exists) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      params.push(dto.name);
    }
    if (dto.phone !== undefined) {
      updates.push('phone = ?');
      params.push(dto.phone);
    }
    if (dto.email !== undefined) {
      updates.push('email = ?');
      params.push(dto.email);
    }
    if (dto.operator !== undefined) {
      updates.push('operator = ?');
      params.push(dto.operator);
    }
    if (dto.notes !== undefined) {
      updates.push('notes = ?');
      params.push(dto.notes);
    }

    params.push(id);

    await this.db.run(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const customer = await this.db.get<any>(
      'SELECT * FROM customers WHERE id = ?',
      [id],
    );

    const accountCountResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM accounts WHERE customer_id = ?',
      [id],
    );

    return {
      ...customer,
      accountCount: accountCountResult?.count || 0,
    };
  }

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const exists = await this.db.get(
      'SELECT * FROM customers WHERE id = ?',
      [id],
    );
    if (!exists) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    await this.db.run('DELETE FROM customers WHERE id = ?', [id]);
    return { message: `Customer ${id} deleted successfully` };
  }

  // ============================================================================
  // ACCOUNT CRUD
  // ============================================================================

  async listAccounts(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    customerId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * pageSize;
    const params: any[] = [];

    let countSql = 'SELECT COUNT(*) as count FROM accounts a';
    let dataSql = `
      SELECT a.id, a.customer_id, a.username, a.platform_name, a.status,
             a.uuid, a.last_login_at, a.notes, a.created_at, a.updated_at,
             c.name as customer_name
      FROM accounts a
      LEFT JOIN customers c ON a.customer_id = c.id
    `;

    const conditions: string[] = [];

    if (customerId) {
      conditions.push('a.customer_id = ?');
      params.push(customerId);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(`(a.username LIKE ? OR a.platform_name LIKE ? OR c.name LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      countSql += whereClause;
      dataSql += whereClause;
    }

    dataSql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, skip);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await this.db.get<{ count: number }>(countSql, countParams);
    const total = countResult?.count || 0;

    const accounts = await this.db.all<any>(dataSql, params);

    // Fetch salon counts for each account
    const dataWithCounts = [];
    for (const account of accounts) {
      const salonCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM salons WHERE account_id = ?',
        [account.id],
      );
      dataWithCounts.push({
        id: account.id,
        customerId: account.customer_id,
        username: account.username,
        platformName: account.platform_name,
        status: account.status,
        uuid: account.uuid,
        lastLoginAt: account.last_login_at,
        notes: account.notes,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        customerName: account.customer_name,
        salonCount: salonCount?.count || 0,
      });
    }

    return {
      data: dataWithCounts,
      total,
      page,
      pageSize,
    };
  }

  async getAccount(id: string): Promise<any> {
    const account = await this.db.get<any>(
      `SELECT a.id, a.customer_id, a.username, a.platform_name, a.status,
              a.uuid, a.last_login_at, a.notes, a.created_at, a.updated_at,
              c.name as customer_name
       FROM accounts a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [id],
    );

    if (!account) {
      throw new NotFoundException(`Account with id ${id} not found`);
    }

    const salons = await this.db.all<any>(
      `SELECT id, name, subdomain, status, created_at
       FROM salons WHERE account_id = ?`,
      [id],
    );

    return {
      id: account.id,
      customerId: account.customer_id,
      username: account.username,
      platformName: account.platform_name,
      status: account.status,
      uuid: account.uuid,
      lastLoginAt: account.last_login_at,
      notes: account.notes,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      customerName: account.customer_name,
      salons: salons.map((s) => ({
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        status: s.status,
        createdAt: s.created_at,
      })),
    };
  }

  async createAccount(dto: CreateAccountDto): Promise<any> {
    // Verify customer exists
    const customer = await this.db.get(
      'SELECT * FROM customers WHERE id = ?',
      [dto.customerId],
    );
    if (!customer) {
      throw new NotFoundException(
        `Customer with id ${dto.customerId} not found`,
      );
    }

    // Check if username is unique
    const existingAccount = await this.db.get(
      'SELECT * FROM accounts WHERE username = ?',
      [dto.username],
    );
    if (existingAccount) {
      throw new BadRequestException(
        `Username ${dto.username} is already taken`,
      );
    }

    const id = this.db.generateId();
    const uuid = this.db.generateId();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.db.run(
      `INSERT INTO accounts (id, customer_id, username, password_hash, platform_name, uuid, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.customerId,
        dto.username,
        passwordHash,
        dto.platformName || null,
        uuid,
        'ACTIVE',
        dto.notes || null,
        now,
        now,
      ],
    );

    const createdAccount = await this.db.get<any>(
      `SELECT a.id, a.customer_id, a.username, a.platform_name, a.status,
              a.uuid, a.last_login_at, a.notes, a.created_at, a.updated_at,
              c.name as customer_name
       FROM accounts a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [id],
    );

    const salons = await this.db.all<any>(
      `SELECT id, name, subdomain, status, created_at
       FROM salons WHERE account_id = ?`,
      [id],
    );

    return {
      id: createdAccount.id,
      customerId: createdAccount.customer_id,
      username: createdAccount.username,
      platformName: createdAccount.platform_name,
      status: createdAccount.status,
      uuid: createdAccount.uuid,
      lastLoginAt: createdAccount.last_login_at,
      notes: createdAccount.notes,
      createdAt: createdAccount.created_at,
      updatedAt: createdAccount.updated_at,
      customerName: createdAccount.customer_name,
      salons: salons.map((s) => ({
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        status: s.status,
        createdAt: s.created_at,
      })),
    };
  }

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<any> {
    const account = await this.db.get<any>(
      'SELECT * FROM accounts WHERE id = ?',
      [id],
    );
    if (!account) {
      throw new NotFoundException(`Account with id ${id} not found`);
    }

    // If updating username, check uniqueness (excluding current account)
    if (dto.username && dto.username !== account.username) {
      const existing = await this.db.get(
        'SELECT * FROM accounts WHERE username = ?',
        [dto.username],
      );
      if (existing) {
        throw new BadRequestException(
          `Username ${dto.username} is already taken`,
        );
      }
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (dto.username !== undefined) {
      updates.push('username = ?');
      params.push(dto.username);
    }
    if (dto.password !== undefined) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }
    if (dto.platformName !== undefined) {
      updates.push('platform_name = ?');
      params.push(dto.platformName || null);
    }
    if (dto.status !== undefined) {
      updates.push('status = ?');
      params.push(dto.status);
    }
    if (dto.notes !== undefined) {
      updates.push('notes = ?');
      params.push(dto.notes || null);
    }

    params.push(id);

    await this.db.run(
      `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updated = await this.db.get<any>(
      `SELECT a.id, a.customer_id, a.username, a.platform_name, a.status,
              a.uuid, a.last_login_at, a.notes, a.created_at, a.updated_at,
              c.name as customer_name
       FROM accounts a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.id = ?`,
      [id],
    );

    const salons = await this.db.all<any>(
      `SELECT id, name, subdomain, status, created_at
       FROM salons WHERE account_id = ?`,
      [id],
    );

    return {
      id: updated.id,
      customerId: updated.customer_id,
      username: updated.username,
      platformName: updated.platform_name,
      status: updated.status,
      uuid: updated.uuid,
      lastLoginAt: updated.last_login_at,
      notes: updated.notes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      customerName: updated.customer_name,
      salons: salons.map((s) => ({
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        status: s.status,
        createdAt: s.created_at,
      })),
    };
  }

  async deleteAccount(id: string): Promise<{ message: string }> {
    const account = await this.db.get(
      'SELECT * FROM accounts WHERE id = ?',
      [id],
    );
    if (!account) {
      throw new NotFoundException(`Account with id ${id} not found`);
    }

    await this.db.run('UPDATE accounts SET status = ? WHERE id = ?', ['DELETED', id]);
    return { message: `Account ${id} soft deleted successfully` };
  }

  // ============================================================================
  // SALON CRUD WITH DEFAULT CONFIG
  // ============================================================================

  async createSalonForAccount(
    accountId: string,
    dto: CreateSalonDto,
  ): Promise<any> {
    // Verify account exists
    const account = await this.db.get<any>(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId],
    );
    if (!account) {
      throw new NotFoundException(`Account with id ${accountId} not found`);
    }

    // Check subdomain uniqueness
    const existingSalon = await this.db.get(
      'SELECT * FROM salons WHERE subdomain = ?',
      [dto.subdomain],
    );
    if (existingSalon) {
      throw new BadRequestException(
        `Subdomain ${dto.subdomain} is already taken`,
      );
    }

    const salonId = this.db.generateId();
    const now = new Date().toISOString();

    // 1. Create salon
    await this.db.run(
      `INSERT INTO salons (id, account_id, name, subdomain, industry, currency, timezone, phone, email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        salonId,
        accountId,
        dto.name,
        dto.subdomain,
        dto.industry || 'beauty',
        dto.currency || 'USD',
        dto.timezone || 'America/New_York',
        dto.phone || null,
        dto.email || null,
        'ACTIVE',
        now,
        now,
      ],
    );

    // 2. Create default business hours (Mon-Sat 9:00-18:00, Sun closed)
    const businessHours = [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Monday
      { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Tuesday
      { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Wednesday
      { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Thursday
      { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Friday
      { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: 0 }, // Saturday
      { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: 1 }, // Sunday
    ];

    for (const bh of businessHours) {
      await this.db.run(
        `INSERT INTO business_hours (id, salon_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [this.db.generateId(), salonId, bh.dayOfWeek, bh.openTime, bh.closeTime, bh.isClosed],
      );
    }

    // 3. Create default booking settings
    await this.db.run(
      `INSERT INTO booking_settings (id, salon_id, buffer_minutes, min_advance_minutes, allow_multi_service, allow_multi_person, sms_verification, assignment_strategy, allow_gender_filter, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.db.generateId(),
        salonId,
        0,
        60,
        0,
        0,
        0,
        'COUNT',
        0,
        now,
      ],
    );

    // 4. Create default website config
    await this.db.run(
      `INSERT INTO website_configs (id, salon_id, theme, navbar, sections, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [this.db.generateId(), salonId, '{}', '{}', '[]', now],
    );

    // 5. Create default staff record (OWNER) linked to account
    await this.db.run(
      `INSERT INTO staff (id, salon_id, account_id, name, email, phone, role, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.db.generateId(),
        salonId,
        accountId,
        account.username,
        null,
        null,
        'OWNER',
        1,
        0,
        now,
        now,
      ],
    );

    return this.getSalon(salonId);
  }

  async getSalon(id: string): Promise<any> {
    const salon = await this.db.get<any>(
      `SELECT s.id, s.account_id, s.name, s.subdomain, s.custom_domain, s.status,
              s.industry, s.currency, s.timezone, s.phone, s.email, s.logo_url,
              s.address_line1, s.address_line2, s.city, s.state, s.zip_code, s.country,
              s.latitude, s.longitude, s.created_at, s.updated_at,
              a.username as account_username
       FROM salons s
       LEFT JOIN accounts a ON s.account_id = a.id
       WHERE s.id = ?`,
      [id],
    );

    if (!salon) {
      throw new NotFoundException(`Salon with id ${id} not found`);
    }

    const businessHours = await this.db.all<any>(
      `SELECT id, salon_id, day_of_week, open_time, close_time, is_closed
       FROM business_hours WHERE salon_id = ? ORDER BY day_of_week ASC`,
      [id],
    );

    const bookingSettings = await this.db.get<any>(
      `SELECT id, salon_id, buffer_minutes, min_advance_minutes, allow_multi_service,
              allow_multi_person, sms_verification, assignment_strategy, allow_gender_filter, updated_at
       FROM booking_settings WHERE salon_id = ?`,
      [id],
    );

    const websiteConfig = await this.db.get<any>(
      `SELECT id, salon_id, theme, navbar, announcement, hero, sections, footer,
              service_page, seo, published_at, updated_at
       FROM website_configs WHERE salon_id = ?`,
      [id],
    );

    return {
      id: salon.id,
      accountId: salon.account_id,
      name: salon.name,
      subdomain: salon.subdomain,
      customDomain: salon.custom_domain,
      status: salon.status,
      industry: salon.industry,
      currency: salon.currency,
      timezone: salon.timezone,
      phone: salon.phone,
      email: salon.email,
      logoUrl: salon.logo_url,
      addressLine1: salon.address_line1,
      addressLine2: salon.address_line2,
      city: salon.city,
      state: salon.state,
      zipCode: salon.zip_code,
      country: salon.country,
      latitude: salon.latitude,
      longitude: salon.longitude,
      createdAt: salon.created_at,
      updatedAt: salon.updated_at,
      accountUsername: salon.account_username,
      businessHours: businessHours.map((bh) => ({
        id: bh.id,
        salonId: bh.salon_id,
        dayOfWeek: bh.day_of_week,
        openTime: bh.open_time,
        closeTime: bh.close_time,
        isClosed: bh.is_closed === 1,
      })),
      bookingSettings: bookingSettings
        ? {
            id: bookingSettings.id,
            salonId: bookingSettings.salon_id,
            bufferMinutes: bookingSettings.buffer_minutes,
            minAdvanceMinutes: bookingSettings.min_advance_minutes,
            allowMultiService: bookingSettings.allow_multi_service === 1,
            allowMultiPerson: bookingSettings.allow_multi_person === 1,
            smsVerification: bookingSettings.sms_verification === 1,
            assignmentStrategy: bookingSettings.assignment_strategy,
            allowGenderFilter: bookingSettings.allow_gender_filter === 1,
            updatedAt: bookingSettings.updated_at,
          }
        : null,
      websiteConfig: websiteConfig
        ? {
            id: websiteConfig.id,
            salonId: websiteConfig.salon_id,
            theme: websiteConfig.theme,
            navbar: websiteConfig.navbar,
            announcement: websiteConfig.announcement,
            hero: websiteConfig.hero,
            sections: websiteConfig.sections,
            footer: websiteConfig.footer,
            servicePage: websiteConfig.service_page,
            seo: websiteConfig.seo,
            publishedAt: websiteConfig.published_at,
            updatedAt: websiteConfig.updated_at,
          }
        : null,
    };
  }

  async listSalonsForAccount(accountId: string): Promise<any[]> {
    const account = await this.db.get(
      'SELECT * FROM accounts WHERE id = ?',
      [accountId],
    );
    if (!account) {
      throw new NotFoundException(`Account with id ${accountId} not found`);
    }

    const salons = await this.db.all<any>(
      `SELECT id, account_id, name, subdomain, custom_domain, status, industry,
              currency, timezone, phone, email, logo_url, address_line1, address_line2,
              city, state, zip_code, country, latitude, longitude, created_at, updated_at
       FROM salons WHERE account_id = ? ORDER BY created_at DESC`,
      [accountId],
    );

    const results = [];
    for (const salon of salons) {
      const businessHours = await this.db.all<any>(
        `SELECT id, salon_id, day_of_week, open_time, close_time, is_closed
         FROM business_hours WHERE salon_id = ? ORDER BY day_of_week ASC`,
        [salon.id],
      );

      const bookingSettings = await this.db.get<any>(
        `SELECT id, salon_id, buffer_minutes, min_advance_minutes, allow_multi_service,
                allow_multi_person, sms_verification, assignment_strategy, allow_gender_filter, updated_at
         FROM booking_settings WHERE salon_id = ?`,
        [salon.id],
      );

      results.push({
        id: salon.id,
        accountId: salon.account_id,
        name: salon.name,
        subdomain: salon.subdomain,
        customDomain: salon.custom_domain,
        status: salon.status,
        industry: salon.industry,
        currency: salon.currency,
        timezone: salon.timezone,
        phone: salon.phone,
        email: salon.email,
        logoUrl: salon.logo_url,
        addressLine1: salon.address_line1,
        addressLine2: salon.address_line2,
        city: salon.city,
        state: salon.state,
        zipCode: salon.zip_code,
        country: salon.country,
        latitude: salon.latitude,
        longitude: salon.longitude,
        createdAt: salon.created_at,
        updatedAt: salon.updated_at,
        businessHours: businessHours.map((bh) => ({
          id: bh.id,
          salonId: bh.salon_id,
          dayOfWeek: bh.day_of_week,
          openTime: bh.open_time,
          closeTime: bh.close_time,
          isClosed: bh.is_closed === 1,
        })),
        bookingSettings: bookingSettings
          ? {
              id: bookingSettings.id,
              salonId: bookingSettings.salon_id,
              bufferMinutes: bookingSettings.buffer_minutes,
              minAdvanceMinutes: bookingSettings.min_advance_minutes,
              allowMultiService: bookingSettings.allow_multi_service === 1,
              allowMultiPerson: bookingSettings.allow_multi_person === 1,
              smsVerification: bookingSettings.sms_verification === 1,
              assignmentStrategy: bookingSettings.assignment_strategy,
              allowGenderFilter: bookingSettings.allow_gender_filter === 1,
              updatedAt: bookingSettings.updated_at,
            }
          : null,
      });
    }
    return results;
  }

  // ============================================================================
  // DASHBOARD STATS
  // ============================================================================

  async getDashboardStats(): Promise<any> {
    const customerCount = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM customers', []);
    const accountCount = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM accounts WHERE status != ?', ['DELETED']);
    const activeAccountCount = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM accounts WHERE status = ?', ['ACTIVE']);
    const salonCount = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM salons WHERE status = ?', ['ACTIVE']);
    const totalSalonCount = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM salons', []);

    // Today's appointments across all salons
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM appointments WHERE date = ?',
      [today],
    );

    // Total revenue (completed appointments)
    const totalRevenue = await this.db.get<{ total: number }>(
      'SELECT COALESCE(SUM(total_price), 0) as total FROM appointments WHERE status = ?',
      ['COMPLETED'],
    );

    // Recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentAccounts = await this.db.all<any>(
      `SELECT a.id, a.username, a.platform_name, a.created_at, c.name as customer_name
       FROM accounts a
       LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.created_at >= ? AND a.status != ?
       ORDER BY a.created_at DESC LIMIT 10`,
      [sevenDaysAgo, 'DELETED'],
    );

    const recentSalons = await this.db.all<any>(
      `SELECT s.id, s.name, s.subdomain, s.status, s.created_at, a.username as account_username
       FROM salons s
       LEFT JOIN accounts a ON s.account_id = a.id
       WHERE s.created_at >= ?
       ORDER BY s.created_at DESC LIMIT 10`,
      [sevenDaysAgo],
    );

    return {
      totalCustomers: customerCount?.count || 0,
      totalAccounts: accountCount?.count || 0,
      activeAccounts: activeAccountCount?.count || 0,
      totalSalons: totalSalonCount?.count || 0,
      activeSalons: salonCount?.count || 0,
      todayAppointments: todayAppointments?.count || 0,
      totalRevenue: totalRevenue?.total || 0,
      recentAccounts: recentAccounts.map(a => ({
        id: a.id,
        username: a.username,
        platformName: a.platform_name,
        customerName: a.customer_name,
        createdAt: a.created_at,
      })),
      recentSalons: recentSalons.map(s => ({
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        status: s.status,
        accountUsername: s.account_username,
        createdAt: s.created_at,
      })),
    };
  }

  // ============================================================================
  // ALL SALONS (CROSS-ACCOUNT)
  // ============================================================================

  async listAllSalons(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    status?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * pageSize;
    const params: any[] = [];

    let countSql = 'SELECT COUNT(*) as count FROM salons s LEFT JOIN accounts a ON s.account_id = a.id';
    let dataSql = `
      SELECT s.id, s.account_id, s.name, s.subdomain, s.custom_domain, s.status,
             s.industry, s.currency, s.timezone, s.phone, s.email, s.logo_url,
             s.address_line1, s.city, s.state, s.zip_code,
             s.created_at, s.updated_at,
             a.username as account_username, a.platform_name,
             c.name as customer_name
      FROM salons s
      LEFT JOIN accounts a ON s.account_id = a.id
      LEFT JOIN customers c ON a.customer_id = c.id
    `;

    const conditions: string[] = [];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    if (search) {
      const searchTerm = '%' + search + '%';
      conditions.push('(s.name LIKE ? OR s.subdomain LIKE ? OR a.username LIKE ? OR c.name LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      countSql += whereClause;
      dataSql += whereClause;
    }

    dataSql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, skip);

    const countParams = params.slice(0, params.length - 2);
    const countResult = await this.db.get<{ count: number }>(countSql, countParams);
    const total = countResult?.count || 0;

    const salons = await this.db.all<any>(dataSql, params);

    // Get staff count and service count for each salon
    const enriched = [];
    for (const salon of salons) {
      const staffCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM staff WHERE salon_id = ? AND is_active = 1',
        [salon.id],
      );
      const serviceCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM services WHERE salon_id = ? AND is_active = 1',
        [salon.id],
      );
      enriched.push({
        id: salon.id,
        accountId: salon.account_id,
        name: salon.name,
        subdomain: salon.subdomain,
        customDomain: salon.custom_domain,
        status: salon.status,
        industry: salon.industry,
        currency: salon.currency,
        timezone: salon.timezone,
        phone: salon.phone,
        email: salon.email,
        logoUrl: salon.logo_url,
        addressLine1: salon.address_line1,
        city: salon.city,
        state: salon.state,
        zipCode: salon.zip_code,
        createdAt: salon.created_at,
        updatedAt: salon.updated_at,
        accountUsername: salon.account_username,
        platformName: salon.platform_name,
        customerName: salon.customer_name,
        staffCount: staffCount?.count || 0,
        serviceCount: serviceCount?.count || 0,
      });
    }

    return {
      data: enriched,
      total,
      page,
      pageSize,
    };
  }

  // ============================================================================
  // SALON SERVICES, STAFF, BOOKINGS
  // ============================================================================

  async getSalonServices(salonId: string): Promise<any[]> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const services = await this.db.all<any>(
      `SELECT s.id, s.salon_id, s.name, s.description, s.duration, s.price,
              s.is_active, s.sort_order, s.created_at, s.updated_at,
              sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON s.category_id = sc.id
       WHERE s.salon_id = ?
       ORDER BY s.sort_order ASC, s.name ASC`,
      [salonId],
    );

    return services.map(s => ({
      id: s.id,
      salonId: s.salon_id,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      isActive: s.is_active === 1,
      sortOrder: s.sort_order,
      categoryName: s.category_name,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  async getSalonStaff(salonId: string): Promise<any[]> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const staff = await this.db.all<any>(
      `SELECT id, salon_id, account_id, name, email, phone, role, avatar_url,
              bio, is_active, sort_order, created_at, updated_at
       FROM staff
       WHERE salon_id = ?
       ORDER BY sort_order ASC, name ASC`,
      [salonId],
    );

    return staff.map(s => ({
      id: s.id,
      salonId: s.salon_id,
      accountId: s.account_id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      avatarUrl: s.avatar_url,
      bio: s.bio,
      isActive: s.is_active === 1,
      sortOrder: s.sort_order,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  async getSalonBookings(salonId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<any>> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const skip = (page - 1) * pageSize;

    const countResult = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM appointments WHERE salon_id = ?',
      [salonId],
    );
    const total = countResult?.count || 0;

    const bookings = await this.db.all<any>(
      `SELECT a.id, a.salon_id, a.date, a.start_time, a.end_time, a.status,
              a.total_price, a.notes, a.created_at,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email,
              c.phone as customer_phone
       FROM appointments a
       LEFT JOIN clients c ON a.client_id = c.id
       WHERE a.salon_id = ?
       ORDER BY a.date DESC, a.start_time DESC
       LIMIT ? OFFSET ?`,
      [salonId, pageSize, skip],
    );

    // For each booking, get the first service and staff from appointment_services
    const enrichedBookings = [];
    for (const b of bookings) {
      const apptService = await this.db.get<any>(
        `SELECT aps.price, aps.duration,
                sv.name as service_name,
                st.name as staff_name
         FROM appointment_services aps
         LEFT JOIN services sv ON aps.service_id = sv.id
         LEFT JOIN staff st ON aps.staff_id = st.id
         WHERE aps.appointment_id = ?
         LIMIT 1`,
        [b.id],
      );
      enrichedBookings.push({
        id: b.id,
        salonId: b.salon_id,
        date: b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        totalPrice: b.total_price,
        notes: b.notes,
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        customerPhone: b.customer_phone,
        staffName: apptService?.staff_name || '—',
        serviceName: apptService?.service_name || '—',
        createdAt: b.created_at,
      });
    }

    return {
      data: enrichedBookings,
      total,
      page,
      pageSize,
    };
  }

  async getCustomerAccounts(customerId: string): Promise<any[]> {
    const customer = await this.db.get('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (!customer) throw new NotFoundException(`Customer ${customerId} not found`);

    const accounts = await this.db.all<any>(
      `SELECT a.id, a.username, a.platform_name, a.status, a.uuid,
              a.last_login_at, a.notes, a.created_at, a.updated_at
       FROM accounts a
       WHERE a.customer_id = ?
       ORDER BY a.created_at DESC`,
      [customerId],
    );

    const result = [];
    for (const account of accounts) {
      const salonCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM salons WHERE account_id = ?',
        [account.id],
      );
      result.push({
        id: account.id,
        username: account.username,
        platformName: account.platform_name,
        status: account.status,
        uuid: account.uuid,
        lastLoginAt: account.last_login_at,
        notes: account.notes,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        salonCount: salonCount?.count || 0,
      });
    }
    return result;
  }

  async updateSalon(id: string, data: any): Promise<any> {
    const salon = await this.db.get('SELECT * FROM salons WHERE id = ?', [id]);
    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    const fields: Record<string, string> = {
      name: 'name',
      subdomain: 'subdomain',
      customDomain: 'custom_domain',
      status: 'status',
      industry: 'industry',
      currency: 'currency',
      timezone: 'timezone',
      phone: 'phone',
      email: 'email',
      logoUrl: 'logo_url',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      city: 'city',
      state: 'state',
      zipCode: 'zip_code',
      country: 'country',
    };

    for (const [key, col] of Object.entries(fields)) {
      if (data[key] !== undefined) {
        updates.push(col + ' = ?');
        params.push(data[key]);
      }
    }

    params.push(id);
    await this.db.run(`UPDATE salons SET ${updates.join(', ')} WHERE id = ?`, params);

    return this.getSalon(id);
  }

  // ============================================================================
  // READ-ONLY GETTERS FOR INDIVIDUAL SALON DATA
  // ============================================================================

  async getSalonServiceCategories(salonId: string): Promise<any[]> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const categories = await this.db.all<any>(
      `SELECT id, salon_id, name, sort_order, is_active, created_at
       FROM service_categories
       WHERE salon_id = ?
       ORDER BY sort_order ASC`,
      [salonId],
    );

    const result = [];
    for (const cat of categories) {
      const services = await this.db.all<any>(
        `SELECT id, name, description, price, duration, cover_image_url, is_active, sort_order
         FROM services
         WHERE category_id = ? AND salon_id = ?
         ORDER BY sort_order ASC`,
        [cat.id, salonId],
      );
      result.push({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sort_order,
        isActive: cat.is_active === 1,
        services: services.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          coverImageUrl: s.cover_image_url,
          isActive: s.is_active === 1,
          sortOrder: s.sort_order,
          categoryId: cat.id,
        })),
      });
    }
    return result;
  }

  async getSalonBusinessHours(salonId: string): Promise<any[]> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const hours = await this.db.all<any>(
      `SELECT id, day_of_week, open_time, close_time, is_closed
       FROM business_hours
       WHERE salon_id = ?
       ORDER BY day_of_week ASC`,
      [salonId],
    );

    return hours.map((h: any) => ({
      id: h.id,
      dayOfWeek: h.day_of_week,
      openTime: h.open_time,
      closeTime: h.close_time,
      isClosed: h.is_closed === 1,
    }));
  }

  async getSalonBookingSettings(salonId: string): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const settings = await this.db.get<any>(
      `SELECT * FROM booking_settings WHERE salon_id = ?`,
      [salonId],
    );

    if (!settings) return null;

    return {
      bufferMinutes: settings.buffer_minutes,
      minAdvanceMinutes: settings.min_advance_minutes,
      allowMultiService: settings.allow_multi_service === 1,
      allowMultiPerson: settings.allow_multi_person === 1,
      smsVerification: settings.sms_verification === 1,
      assignmentStrategy: settings.assignment_strategy,
      allowGenderFilter: settings.allow_gender_filter === 1,
      notificationPhone: settings.notification_phone,
      notificationEmail: settings.notification_email,
    };
  }

  // ============================================================================
  // SERVICE CATEGORIES (PLATFORM ADMIN)
  // ============================================================================

  async createServiceCategory(
    salonId: string,
    data: { name: string; sortOrder?: number },
  ): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const id = this.db.generateId();
    const sortOrder = data.sortOrder ?? 0;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO service_categories (id, salon_id, name, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [id, salonId, data.name, sortOrder, now],
    );

    const row = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);
    return this.normalizeServiceCategory(row);
  }

  async updateServiceCategory(
    salonId: string,
    catId: string,
    data: { name?: string; sortOrder?: number },
  ): Promise<any> {
    const category = await this.db.get(
      'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
      [catId, salonId],
    );
    if (!category) {
      throw new NotFoundException(`Service category ${catId} not found in salon ${salonId}`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sortOrder);
    }

    if (updates.length === 0) {
      return this.normalizeServiceCategory(category);
    }

    params.push(catId);
    await this.db.run(
      `UPDATE service_categories SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const row = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [catId]);
    return this.normalizeServiceCategory(row);
  }

  async deleteServiceCategory(salonId: string, catId: string): Promise<any> {
    const category = await this.db.get(
      'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
      [catId, salonId],
    );
    if (!category) {
      throw new NotFoundException(`Service category ${catId} not found in salon ${salonId}`);
    }

    await this.db.run('DELETE FROM service_categories WHERE id = ?', [catId]);
    return this.normalizeServiceCategory(category);
  }

  // ============================================================================
  // SERVICES (PLATFORM ADMIN)
  // ============================================================================

  async createService(salonId: string, data: any): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const category = await this.db.get(
      'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
      [data.categoryId, salonId],
    );
    if (!category) {
      throw new NotFoundException('Service category not found or does not belong to this salon');
    }

    const id = this.db.generateId();
    const sortOrder = data.sortOrder ?? 0;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, cover_image_url, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        salonId,
        data.categoryId,
        data.name,
        data.description || null,
        data.price,
        data.duration,
        data.coverImageUrl || null,
        sortOrder,
        now,
        now,
      ],
    );

    const row = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
    return this.normalizeService(row);
  }

  async updateService(salonId: string, serviceId: string, data: any): Promise<any> {
    const service = await this.db.get(
      'SELECT * FROM services WHERE id = ? AND salon_id = ?',
      [serviceId, salonId],
    );
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found in salon ${salonId}`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration);
    }
    if (data.categoryId !== undefined) {
      const category = await this.db.get(
        'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
        [data.categoryId, salonId],
      );
      if (!category) throw new NotFoundException('Service category not found');
      updates.push('category_id = ?');
      params.push(data.categoryId);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sortOrder);
    }
    if (data.coverImageUrl !== undefined) {
      updates.push('cover_image_url = ?');
      params.push(data.coverImageUrl);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.normalizeService(service);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(serviceId);
    await this.db.run(
      `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const row = await this.db.get('SELECT * FROM services WHERE id = ?', [serviceId]);
    return this.normalizeService(row);
  }

  async deleteService(salonId: string, serviceId: string): Promise<any> {
    const service = await this.db.get(
      'SELECT * FROM services WHERE id = ? AND salon_id = ?',
      [serviceId, salonId],
    );
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found in salon ${salonId}`);
    }

    await this.db.run('DELETE FROM services WHERE id = ?', [serviceId]);
    return this.normalizeService(service);
  }

  // ============================================================================
  // STAFF (PLATFORM ADMIN)
  // ============================================================================

  async createStaff(salonId: string, data: any): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    const id = this.db.generateId();
    const now = new Date().toISOString();
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();

    await this.db.run(
      `INSERT INTO staff (id, salon_id, name, email, phone, role, bio, avatar_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        salonId,
        fullName,
        data.email || null,
        data.phone || null,
        data.role,
        data.bio || null,
        data.avatarUrl || null,
        now,
        now,
      ],
    );

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);
    return this.normalizeStaff(row);
  }

  async updateStaff(salonId: string, staffId: string, data: any): Promise<any> {
    const staff = await this.db.get(
      'SELECT * FROM staff WHERE id = ? AND salon_id = ?',
      [staffId, salonId],
    );
    if (!staff) {
      throw new NotFoundException(`Staff ${staffId} not found in salon ${salonId}`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.firstName !== undefined || data.lastName !== undefined) {
      const currentName = staff.name || '';
      const currentParts = currentName.split(' ');
      const newFirst = data.firstName !== undefined ? data.firstName : (currentParts[0] || '');
      const newLast = data.lastName !== undefined ? data.lastName : (currentParts.slice(1).join(' ') || '');
      updates.push('name = ?');
      params.push(`${newFirst} ${newLast}`.trim());
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(data.avatarUrl);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.normalizeStaff(staff);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(staffId);
    await this.db.run(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [staffId]);
    return this.normalizeStaff(row);
  }

  async deleteStaff(salonId: string, staffId: string): Promise<any> {
    const staff = await this.db.get(
      'SELECT * FROM staff WHERE id = ? AND salon_id = ?',
      [staffId, salonId],
    );
    if (!staff) {
      throw new NotFoundException(`Staff ${staffId} not found in salon ${salonId}`);
    }

    await this.db.run(
      'UPDATE staff SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), staffId],
    );

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [staffId]);
    return this.normalizeStaff(row);
  }

  // ============================================================================
  // BUSINESS HOURS (PLATFORM ADMIN)
  // ============================================================================

  async updateBusinessHours(salonId: string, hours: any): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    if (hours.length !== 7) {
      throw new BadRequestException('Must provide business hours for all 7 days');
    }

    const dayOfWeeks = hours.map((h: any) => h.dayOfWeek).sort();
    if (!dayOfWeeks.every((d: number, i: number) => d === i)) {
      throw new BadRequestException('dayOfWeek must be 0-6 (one per day)');
    }

    const results = [];
    for (const hour of hours) {
      const id = this.db.generateId();
      await this.db.run(
        `INSERT INTO business_hours (id, salon_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (salon_id, day_of_week) DO UPDATE SET
           open_time = EXCLUDED.open_time,
           close_time = EXCLUDED.close_time,
           is_closed = EXCLUDED.is_closed`,
        [
          id,
          salonId,
          hour.dayOfWeek,
          hour.openTime,
          hour.closeTime,
          hour.isClosed ? 1 : 0,
        ],
      );

      const row = await this.db.get(
        'SELECT * FROM business_hours WHERE salon_id = ? AND day_of_week = ?',
        [salonId, hour.dayOfWeek],
      );
      results.push(this.normalizeBusinessHour(row));
    }

    return results;
  }

  // ============================================================================
  // BOOKING SETTINGS (PLATFORM ADMIN)
  // ============================================================================

  async updateBookingSettings(salonId: string, data: any): Promise<any> {
    const salon = await this.db.get('SELECT id FROM salons WHERE id = ?', [salonId]);
    if (!salon) throw new NotFoundException(`Salon ${salonId} not found`);

    let settings = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salonId],
    );

    if (!settings) {
      const id = this.db.generateId();
      await this.db.run(
        'INSERT INTO booking_settings (id, salon_id) VALUES (?, ?)',
        [id, salonId],
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.bufferMinutes !== undefined) {
      updates.push('buffer_minutes = ?');
      params.push(data.bufferMinutes);
    }
    if (data.minAdvanceMinutes !== undefined) {
      updates.push('min_advance_minutes = ?');
      params.push(data.minAdvanceMinutes);
    }
    if (data.reminderBefore !== undefined) {
      updates.push('reminder_before = ?');
      params.push(JSON.stringify(data.reminderBefore));
    }
    if (data.allowMultiService !== undefined) {
      updates.push('allow_multi_service = ?');
      params.push(data.allowMultiService ? 1 : 0);
    }
    if (data.allowMultiPerson !== undefined) {
      updates.push('allow_multi_person = ?');
      params.push(data.allowMultiPerson ? 1 : 0);
    }
    if (data.smsVerification !== undefined) {
      updates.push('sms_verification = ?');
      params.push(data.smsVerification ? 1 : 0);
    }
    if (data.notificationPhone !== undefined) {
      updates.push('notification_phone = ?');
      params.push(data.notificationPhone);
    }
    if (data.notificationEmail !== undefined) {
      updates.push('notification_email = ?');
      params.push(data.notificationEmail);
    }
    if (data.assignmentStrategy !== undefined) {
      updates.push('assignment_strategy = ?');
      params.push(data.assignmentStrategy);
    }
    if (data.allowGenderFilter !== undefined) {
      updates.push('allow_gender_filter = ?');
      params.push(data.allowGenderFilter ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(salonId);
      await this.db.run(
        `UPDATE booking_settings SET ${updates.join(', ')} WHERE salon_id = ?`,
        params,
      );
    }

    const row = await this.db.get('SELECT * FROM booking_settings WHERE salon_id = ?', [salonId]);
    return this.normalizeBookingSettings(row);
  }

  // ============================================================================
  // APPOINTMENTS (PLATFORM ADMIN)
  // ============================================================================

  async updateAppointmentStatus(salonId: string, aptId: string, status: string): Promise<any> {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [aptId, salonId],
    );
    if (!appointment) {
      throw new NotFoundException(`Appointment ${aptId} not found in salon ${salonId}`);
    }

    const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'IN_PROGRESS'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, aptId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [aptId]);
    return this.normalizeAppointment(row);
  }

  // ============================================================================
  // NORMALIZATION HELPERS
  // ============================================================================

  private normalizeServiceCategory(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  private normalizeService(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: row.price,
      duration: row.duration,
      coverImageUrl: row.cover_image_url,
      isActive: row.is_active === 1,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeStaff(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      accountId: row.account_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      isActive: row.is_active === 1,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeBusinessHour(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      dayOfWeek: row.day_of_week,
      openTime: row.open_time,
      closeTime: row.close_time,
      isClosed: row.is_closed === 1,
    };
  }

  private normalizeBookingSettings(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      bufferMinutes: row.buffer_minutes,
      minAdvanceMinutes: row.min_advance_minutes,
      reminderBefore: row.reminder_before ? JSON.parse(row.reminder_before) : [],
      allowMultiService: row.allow_multi_service === 1,
      allowMultiPerson: row.allow_multi_person === 1,
      smsVerification: row.sms_verification === 1,
      notificationPhone: row.notification_phone,
      notificationEmail: row.notification_email,
      assignmentStrategy: row.assignment_strategy,
      allowGenderFilter: row.allow_gender_filter === 1,
      updatedAt: row.updated_at,
    };
  }

  private normalizeAppointment(row: any): any {
    return {
      id: row.id,
      salonId: row.salon_id,
      clientId: row.client_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      totalPrice: row.total_price,
      totalDuration: row.total_duration,
      notes: row.notes,
      internalNotes: row.internal_notes,
      tip: row.tip,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
