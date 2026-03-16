import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

interface BusinessHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface SpecialHourInput {
  date: string;
  isClosed?: boolean;
  openTime?: string;
  closeTime?: string;
  label?: string;
}

interface BookingSettingsInput {
  bufferMinutes?: number;
  minAdvanceMinutes?: number;
  reminderBefore?: string[];
  allowMultiService?: boolean;
  allowMultiPerson?: boolean;
  smsVerification?: boolean;
  notificationPhone?: string;
  notificationEmail?: string;
  assignmentStrategy?: string;
  allowGenderFilter?: boolean;
}

interface ServiceInput {
  name: string;
  description?: string;
  price: number;
  duration: number;
  categoryId: string;
  sortOrder?: number;
  coverImageUrl?: string;
}

interface ServiceAddonInput {
  name: string;
  price: number;
  duration: number;
  sortOrder?: number;
}

interface StaffInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
}

interface StaffWorkHourInput {
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  isOff: boolean;
}

@Injectable()
export class SalonService {
  constructor(private db: DatabaseService) {}

  /**
   * Get salon info (all columns)
   */
  async getSalon(salonId: string) {
    const salon = await this.db.get('SELECT * FROM salons WHERE id = ?', [salonId]);

    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return this.normalizeSalon(salon);
  }

  /**
   * Update salon profile
   */
  async updateSalon(
    salonId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      logoUrl?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    },
  ) {
    // Verify salon exists
    await this.getSalon(salonId);

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.logoUrl !== undefined) {
      updates.push('logo_url = ?');
      params.push(data.logoUrl);
    }
    if (data.addressLine1 !== undefined) {
      updates.push('address_line1 = ?');
      params.push(data.addressLine1);
    }
    if (data.addressLine2 !== undefined) {
      updates.push('address_line2 = ?');
      params.push(data.addressLine2);
    }
    if (data.city !== undefined) {
      updates.push('city = ?');
      params.push(data.city);
    }
    if (data.state !== undefined) {
      updates.push('state = ?');
      params.push(data.state);
    }
    if (data.zipCode !== undefined) {
      updates.push('zip_code = ?');
      params.push(data.zipCode);
    }
    if (data.country !== undefined) {
      updates.push('country = ?');
      params.push(data.country);
    }

    // If no updates, return the existing salon
    if (updates.length === 0) {
      return this.getSalon(salonId);
    }

    params.push(new Date().toISOString());
    params.push(salonId);
    const sql = `UPDATE salons SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`;
    await this.db.run(sql, params);

    return this.getSalon(salonId);
  }

  /**
   * Get all 7 business hours sorted by dayOfWeek
   */
  async getBusinessHours(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    const hours = await this.db.all(
      'SELECT * FROM business_hours WHERE salon_id = ? ORDER BY day_of_week ASC',
      [salonId],
    );

    return hours.map(h => this.normalizeBusinessHour(h));
  }

  /**
   * Upsert all 7 business hours using INSERT OR REPLACE
   */
  async updateBusinessHours(salonId: string, hours: BusinessHourInput[]) {
    // Verify salon exists
    await this.getSalon(salonId);

    // Validate that we have exactly 7 days
    if (hours.length !== 7) {
      throw new BadRequestException('Must provide business hours for all 7 days');
    }

    // Validate dayOfWeek values
    const dayOfWeeks = hours.map((h) => h.dayOfWeek).sort();
    if (!dayOfWeeks.every((d, i) => d === i)) {
      throw new BadRequestException('dayOfWeek must be 0-6 (one per day)');
    }

    // Use INSERT ... ON CONFLICT for each day
    const results = [];
    for (const hour of hours) {
      const id = this.db.generateId();
      const sql = `
        INSERT INTO business_hours
        (id, salon_id, day_of_week, open_time, close_time, is_closed)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (salon_id, day_of_week) DO UPDATE SET
          open_time = EXCLUDED.open_time,
          close_time = EXCLUDED.close_time,
          is_closed = EXCLUDED.is_closed
      `;
      await this.db.run(sql, [
        id,
        salonId,
        hour.dayOfWeek,
        hour.openTime,
        hour.closeTime,
        hour.isClosed ? 1 : 0,
      ]);

      // Fetch the inserted record to return it
      const row = await this.db.get(
        'SELECT * FROM business_hours WHERE salon_id = ? AND day_of_week = ?',
        [salonId, hour.dayOfWeek],
      );
      results.push(this.normalizeBusinessHour(row));
    }

    return results;
  }

  /**
   * Get special hours, optionally filtered by date range
   */
  async getSpecialHours(salonId: string, from?: string, to?: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    let sql = 'SELECT * FROM special_hours WHERE salon_id = ?';
    const params: any[] = [salonId];

    if (from) {
      sql += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY date ASC';

    const hours = await this.db.all(sql, params);

    return hours.map(h => this.normalizeSpecialHour(h));
  }

  /**
   * Create special hour
   */
  async createSpecialHour(salonId: string, data: SpecialHourInput) {
    // Verify salon exists
    await this.getSalon(salonId);

    // Validate date is ISO string
    if (!data.date || !this.isValidISODate(data.date)) {
      throw new BadRequestException('date must be a valid ISO date string (YYYY-MM-DD)');
    }

    const id = this.db.generateId();
    const sql = `
      INSERT INTO special_hours
      (id, salon_id, date, is_closed, open_time, close_time, label)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [
      id,
      salonId,
      data.date,
      data.isClosed ? 1 : 0,
      data.openTime || null,
      data.closeTime || null,
      data.label || null,
    ]);

    const row = await this.db.get('SELECT * FROM special_hours WHERE id = ?', [id]);
    return this.normalizeSpecialHour(row);
  }

  /**
   * Update special hour (with salonId verification)
   */
  async updateSpecialHour(id: string, salonId: string, data: Partial<SpecialHourInput>) {
    // Verify the special hour belongs to this salon
    const specialHour = await this.db.get('SELECT * FROM special_hours WHERE id = ?', [id]);

    if (!specialHour) {
      throw new NotFoundException(`Special hour with ID ${id} not found`);
    }

    if (specialHour.salon_id !== salonId) {
      throw new BadRequestException('Special hour does not belong to this salon');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date);
    }
    if (data.isClosed !== undefined) {
      updates.push('is_closed = ?');
      params.push(data.isClosed ? 1 : 0);
    }
    if (data.openTime !== undefined) {
      updates.push('open_time = ?');
      params.push(data.openTime);
    }
    if (data.closeTime !== undefined) {
      updates.push('close_time = ?');
      params.push(data.closeTime);
    }
    if (data.label !== undefined) {
      updates.push('label = ?');
      params.push(data.label);
    }

    // If no updates, return the existing record
    if (updates.length === 0) {
      return this.normalizeSpecialHour(specialHour);
    }

    params.push(id);
    const sql = `UPDATE special_hours SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM special_hours WHERE id = ?', [id]);
    return this.normalizeSpecialHour(row);
  }

  /**
   * Delete special hour (with salonId verification)
   */
  async deleteSpecialHour(id: string, salonId: string) {
    // Verify the special hour belongs to this salon
    const specialHour = await this.db.get('SELECT * FROM special_hours WHERE id = ?', [id]);

    if (!specialHour) {
      throw new NotFoundException(`Special hour with ID ${id} not found`);
    }

    if (specialHour.salon_id !== salonId) {
      throw new BadRequestException('Special hour does not belong to this salon');
    }

    await this.db.run('DELETE FROM special_hours WHERE id = ?', [id]);
    return this.normalizeSpecialHour(specialHour);
  }

  /**
   * Get booking settings
   */
  async getBookingSettings(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    let settings = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salonId],
    );

    // If settings don't exist, create default ones
    if (!settings) {
      const id = this.db.generateId();
      await this.db.run(
        'INSERT INTO booking_settings (id, salon_id) VALUES (?, ?)',
        [id, salonId],
      );
      settings = await this.db.get(
        'SELECT * FROM booking_settings WHERE salon_id = ?',
        [salonId],
      );
    }

    return this.normalizeBookingSettings(settings);
  }

  /**
   * Update booking settings (upsert)
   */
  async updateBookingSettings(salonId: string, data: BookingSettingsInput) {
    // Verify salon exists
    await this.getSalon(salonId);

    // Check if settings exist
    let settings = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salonId],
    );

    // If they don't exist, create them first
    if (!settings) {
      const id = this.db.generateId();
      await this.db.run(
        'INSERT INTO booking_settings (id, salon_id) VALUES (?, ?)',
        [id, salonId],
      );
    }

    // Build the update values
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

    // If there are updates, apply them
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(salonId);
      const sql = `UPDATE booking_settings SET ${updates.join(', ')} WHERE salon_id = ?`;
      await this.db.run(sql, params);
    }

    const row = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salonId],
    );
    return this.normalizeBookingSettings(row);
  }

  /**
   * Get all services grouped by category with addons
   */
  async getServices(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    // Get all categories
    const categories = await this.db.all(
      'SELECT * FROM service_categories WHERE salon_id = ? AND is_active = 1 ORDER BY sort_order ASC',
      [salonId],
    );

    // For each category, get its services and their addons
    const result = [];
    for (const category of categories) {
      const services = await this.db.all(
        `SELECT s.* FROM services s
         WHERE s.salon_id = ? AND s.category_id = ? AND s.is_active = 1
         ORDER BY s.sort_order ASC`,
        [salonId, category.id],
      );

      const servicesWithAddons = [];
      for (const service of services) {
        const addons = await this.db.all(
          'SELECT * FROM service_addons WHERE service_id = ? ORDER BY sort_order ASC',
          [service.id],
        );

        servicesWithAddons.push({
          ...this.normalizeService(service),
          addons: addons.map(a => this.normalizeServiceAddon(a)),
        });
      }

      result.push({
        ...this.normalizeServiceCategory(category),
        services: servicesWithAddons,
      });
    }

    return result;
  }

  /**
   * Create service category
   */
  async createServiceCategory(
    salonId: string,
    data: { name: string; sortOrder?: number },
  ) {
    // Verify salon exists
    await this.getSalon(salonId);

    const id = this.db.generateId();
    const sortOrder = data.sortOrder ?? 0;
    const sql = `
      INSERT INTO service_categories
      (id, salon_id, name, sort_order, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `;
    await this.db.run(sql, [id, salonId, data.name, sortOrder, new Date().toISOString()]);

    const row = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);
    return this.normalizeServiceCategory(row);
  }

  /**
   * Update service category
   */
  async updateServiceCategory(id: string, salonId: string, data: { name?: string; sortOrder?: number }) {
    const category = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);

    if (!category) {
      throw new NotFoundException(`Service category with ID ${id} not found`);
    }

    if (category.salon_id !== salonId) {
      throw new BadRequestException('Service category does not belong to this salon');
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

    params.push(id);
    const sql = `UPDATE service_categories SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);
    return this.normalizeServiceCategory(row);
  }

  /**
   * Delete service category
   */
  async deleteServiceCategory(id: string, salonId: string) {
    const category = await this.db.get('SELECT * FROM service_categories WHERE id = ?', [id]);

    if (!category) {
      throw new NotFoundException(`Service category with ID ${id} not found`);
    }

    if (category.salon_id !== salonId) {
      throw new BadRequestException('Service category does not belong to this salon');
    }

    await this.db.run('DELETE FROM service_categories WHERE id = ?', [id]);
    return this.normalizeServiceCategory(category);
  }

  /**
   * Create service
   */
  async createService(salonId: string, data: ServiceInput) {
    // Verify salon exists
    await this.getSalon(salonId);

    // Verify category exists and belongs to this salon
    const category = await this.db.get(
      'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
      [data.categoryId, salonId],
    );

    if (!category) {
      throw new NotFoundException('Service category not found or does not belong to this salon');
    }

    const id = this.db.generateId();
    const sortOrder = data.sortOrder ?? 0;
    const sql = `
      INSERT INTO services
      (id, salon_id, category_id, name, description, price, duration, cover_image_url, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `;
    const now = new Date().toISOString();
    await this.db.run(sql, [
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
    ]);

    const row = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
    return this.normalizeService(row);
  }

  /**
   * Update service
   */
  async updateService(id: string, salonId: string, data: Partial<ServiceInput> & { isActive?: boolean }) {
    const service = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (service.salon_id !== salonId) {
      throw new BadRequestException('Service does not belong to this salon');
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
      // Verify category exists
      const category = await this.db.get(
        'SELECT * FROM service_categories WHERE id = ? AND salon_id = ?',
        [data.categoryId, salonId],
      );
      if (!category) {
        throw new NotFoundException('Service category not found');
      }
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
    params.push(id);
    const sql = `UPDATE services SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);
    return this.normalizeService(row);
  }

  /**
   * Delete service
   */
  async deleteService(id: string, salonId: string) {
    const service = await this.db.get('SELECT * FROM services WHERE id = ?', [id]);

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (service.salon_id !== salonId) {
      throw new BadRequestException('Service does not belong to this salon');
    }

    await this.db.run('DELETE FROM services WHERE id = ?', [id]);
    return this.normalizeService(service);
  }

  /**
   * Create service addon
   */
  async createServiceAddon(serviceId: string, salonId: string, data: ServiceAddonInput) {
    // Verify service exists and belongs to this salon
    const service = await this.db.get(
      'SELECT * FROM services WHERE id = ? AND salon_id = ?',
      [serviceId, salonId],
    );

    if (!service) {
      throw new NotFoundException('Service not found or does not belong to this salon');
    }

    const id = this.db.generateId();
    const sortOrder = data.sortOrder ?? 0;
    const sql = `
      INSERT INTO service_addons
      (id, service_id, salon_id, name, price, duration, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [id, serviceId, salonId, data.name, data.price, data.duration, sortOrder]);

    const row = await this.db.get('SELECT * FROM service_addons WHERE id = ?', [id]);
    return this.normalizeServiceAddon(row);
  }

  /**
   * Update service addon
   */
  async updateServiceAddon(id: string, salonId: string, data: Partial<ServiceAddonInput>) {
    const addon = await this.db.get('SELECT * FROM service_addons WHERE id = ?', [id]);

    if (!addon) {
      throw new NotFoundException(`Service addon with ID ${id} not found`);
    }

    if (addon.salon_id !== salonId) {
      throw new BadRequestException('Service addon does not belong to this salon');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(data.sortOrder);
    }

    if (updates.length === 0) {
      return this.normalizeServiceAddon(addon);
    }

    params.push(id);
    const sql = `UPDATE service_addons SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM service_addons WHERE id = ?', [id]);
    return this.normalizeServiceAddon(row);
  }

  /**
   * Delete service addon
   */
  async deleteServiceAddon(id: string, salonId: string) {
    const addon = await this.db.get('SELECT * FROM service_addons WHERE id = ?', [id]);

    if (!addon) {
      throw new NotFoundException(`Service addon with ID ${id} not found`);
    }

    if (addon.salon_id !== salonId) {
      throw new BadRequestException('Service addon does not belong to this salon');
    }

    await this.db.run('DELETE FROM service_addons WHERE id = ?', [id]);
    return this.normalizeServiceAddon(addon);
  }

  /**
   * Get all staff with their services and work hours
   */
  async getStaff(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    const staff = await this.db.all(
      'SELECT * FROM staff WHERE salon_id = ? ORDER BY sort_order ASC',
      [salonId],
    );

    const result = [];
    for (const member of staff) {
      const services = await this.db.all(
        `SELECT s.* FROM services s
         INNER JOIN staff_services ss ON s.id = ss.service_id
         WHERE ss.staff_id = ?
         ORDER BY s.sort_order ASC`,
        [member.id],
      );

      const workHours = await this.db.all(
        'SELECT * FROM staff_work_hours WHERE staff_id = ? ORDER BY day_of_week ASC',
        [member.id],
      );

      result.push({
        ...this.normalizeStaff(member),
        services: services.map(s => this.normalizeService(s)),
        workHours: workHours.map(h => this.normalizeStaffWorkHour(h)),
      });
    }

    return result;
  }

  /**
   * Create staff member
   */
  async createStaff(salonId: string, data: StaffInput) {
    // Verify salon exists
    await this.getSalon(salonId);

    const id = this.db.generateId();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO staff
      (id, salon_id, first_name, last_name, email, phone, role, bio, avatar_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    await this.db.run(sql, [
      id,
      salonId,
      data.firstName,
      data.lastName,
      data.email || null,
      data.phone || null,
      data.role,
      data.bio || null,
      data.avatarUrl || null,
      now,
      now,
    ]);

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);
    return this.normalizeStaff(row);
  }

  /**
   * Update staff member
   */
  async updateStaff(id: string, salonId: string, data: Partial<StaffInput> & { isActive?: boolean }) {
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    if (staff.salon_id !== salonId) {
      throw new BadRequestException('Staff does not belong to this salon');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(data.lastName);
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
    params.push(id);
    const sql = `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);
    return this.normalizeStaff(row);
  }

  /**
   * Deactivate staff member
   */
  async deleteStaff(id: string, salonId: string) {
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    if (staff.salon_id !== salonId) {
      throw new BadRequestException('Staff does not belong to this salon');
    }

    // Deactivate instead of delete
    await this.db.run(
      'UPDATE staff SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );

    const row = await this.db.get('SELECT * FROM staff WHERE id = ?', [id]);
    return this.normalizeStaff(row);
  }

  /**
   * Assign services to staff
   */
  async assignStaffServices(staffId: string, salonId: string, serviceIds: string[]) {
    // Verify staff exists and belongs to this salon
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ? AND salon_id = ?', [staffId, salonId]);

    if (!staff) {
      throw new NotFoundException('Staff not found or does not belong to this salon');
    }

    // Verify all services exist and belong to this salon
    for (const serviceId of serviceIds) {
      const service = await this.db.get(
        'SELECT * FROM services WHERE id = ? AND salon_id = ?',
        [serviceId, salonId],
      );
      if (!service) {
        throw new NotFoundException(`Service ${serviceId} not found`);
      }
    }

    // Remove existing assignments
    await this.db.run('DELETE FROM staff_services WHERE staff_id = ?', [staffId]);

    // Add new assignments
    for (const serviceId of serviceIds) {
      const id = this.db.generateId();
      await this.db.run(
        'INSERT INTO staff_services (staff_id, service_id, salon_id) VALUES (?, ?, ?)',
        [staffId, serviceId, salonId],
      );
    }

    // Return updated staff with services
    const services = await this.db.all(
      `SELECT s.* FROM services s
       INNER JOIN staff_services ss ON s.id = ss.service_id
       WHERE ss.staff_id = ?`,
      [staffId],
    );

    return {
      staffId,
      services: services.map(s => this.normalizeService(s)),
    };
  }

  /**
   * Update staff work hours
   */
  async updateStaffWorkHours(staffId: string, salonId: string, hours: StaffWorkHourInput[]) {
    // Verify staff exists and belongs to this salon
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ? AND salon_id = ?', [staffId, salonId]);

    if (!staff) {
      throw new NotFoundException('Staff not found or does not belong to this salon');
    }

    // Validate we have all 7 days
    if (hours.length !== 7) {
      throw new BadRequestException('Must provide work hours for all 7 days');
    }

    const dayOfWeeks = hours.map(h => h.dayOfWeek).sort();
    if (!dayOfWeeks.every((d, i) => d === i)) {
      throw new BadRequestException('dayOfWeek must be 0-6 (one per day)');
    }

    // Upsert all work hours
    const results = [];
    for (const hour of hours) {
      const id = this.db.generateId();
      const sql = `
        INSERT INTO staff_work_hours
        (id, staff_id, salon_id, day_of_week, start_time, end_time, is_off)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (staff_id, day_of_week) DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          is_off = EXCLUDED.is_off
      `;
      await this.db.run(sql, [
        id,
        staffId,
        salonId,
        hour.dayOfWeek,
        hour.isOff ? null : hour.startTime,
        hour.isOff ? null : hour.endTime,
        hour.isOff ? 1 : 0,
      ]);

      const row = await this.db.get(
        'SELECT * FROM staff_work_hours WHERE staff_id = ? AND day_of_week = ?',
        [staffId, hour.dayOfWeek],
      );
      results.push(this.normalizeStaffWorkHour(row));
    }

    return results;
  }

  /**
   * Get appointments with filters
   */
  async getAppointments(
    salonId: string,
    filters: { date?: string; status?: string; staffId?: string; page?: number; limit?: number },
  ) {
    // Verify salon exists
    await this.getSalon(salonId);

    let sql = 'SELECT * FROM appointments WHERE salon_id = ?';
    const params: any[] = [salonId];

    if (filters.date) {
      sql += ' AND date = ?';
      params.push(filters.date);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.staffId) {
      sql += ' AND id IN (SELECT appointment_id FROM appointment_services WHERE staff_id = ?)';
      params.push(filters.staffId);
    }

    sql += ' ORDER BY date DESC, start_time DESC';

    // Add pagination (query params may arrive as strings)
    const page = parseInt(String(filters.page), 10) || 1;
    const limit = parseInt(String(filters.limit), 10) || 50;
    const offset = (page - 1) * limit;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const appointments = await this.db.all(sql, params);

    // Get services for each appointment
    const result = [];
    for (const apt of appointments) {
      const services = await this.db.all(
        'SELECT * FROM appointment_services WHERE appointment_id = ?',
        [apt.id],
      );

      result.push({
        ...this.normalizeAppointment(apt),
        services: services.map(s => this.normalizeAppointmentService(s)),
      });
    }

    return result;
  }

  /**
   * Get single appointment with details
   */
  async getAppointment(id: string, salonId: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [id, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const services = await this.db.all(
      'SELECT * FROM appointment_services WHERE appointment_id = ?',
      [id],
    );

    const client = await this.db.get('SELECT * FROM clients WHERE id = ?', [appointment.client_id]);

    return {
      ...this.normalizeAppointment(appointment),
      client: client ? this.normalizeClient(client) : null,
      services: services.map(s => this.normalizeAppointmentService(s)),
    };
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(id: string, salonId: string, status: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [id, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    await this.db.run(
      'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [id]);
    return this.normalizeAppointment(row);
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    const today = new Date().toISOString().split('T')[0];

    // Today's bookings
    const todayBookings = await this.db.get(
      'SELECT COUNT(*) as count FROM appointments WHERE salon_id = ? AND date = ?',
      [salonId, today],
    );

    // Upcoming bookings (future appointments)
    const upcomingBookings = await this.db.get(
      `SELECT COUNT(*) as count FROM appointments
       WHERE salon_id = ? AND date > ? AND status IN ('PENDING', 'CONFIRMED', 'IN_SERVICE')`,
      [salonId, today],
    );

    // Total clients
    const totalClients = await this.db.get(
      'SELECT COUNT(*) as count FROM clients WHERE salon_id = ?',
      [salonId],
    );

    // Month revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthRevenue = await this.db.get(
      `SELECT SUM(total_price) as total FROM appointments
       WHERE salon_id = ? AND date >= ? AND status IN ('COMPLETED')`,
      [salonId, monthStartStr],
    );

    return {
      todayBookings: todayBookings?.count || 0,
      upcomingBookings: upcomingBookings?.count || 0,
      totalClients: totalClients?.count || 0,
      monthRevenue: monthRevenue?.total || 0,
    };
  }

  /**
   * Helper: Validate ISO date string
   */
  private isValidISODate(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso8601Regex.test(dateString)) {
      return false;
    }
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Helper: Convert snake_case database row to camelCase for API
   */
  private normalizeSalon(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      logoUrl: row.logo_url,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      customDomain: row.custom_domain,
    };
  }

  /**
   * Helper: Convert business_hours row to camelCase
   */
  private normalizeBusinessHour(row: any): any {
    if (!row) return row;
    return {
      salonId: row.salon_id,
      dayOfWeek: row.day_of_week,
      openTime: row.open_time,
      closeTime: row.close_time,
      isClosed: row.is_closed === 1,
    };
  }

  /**
   * Helper: Convert special_hours row to camelCase
   */
  private normalizeSpecialHour(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      salonId: row.salon_id,
      date: row.date,
      isClosed: row.is_closed === 1,
      openTime: row.open_time,
      closeTime: row.close_time,
      label: row.label,
    };
  }

  /**
   * Helper: Convert booking_settings row to camelCase
   */
  private normalizeBookingSettings(row: any): any {
    if (!row) return row;
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
    };
  }

  /**
   * Helper: Convert service_categories row to camelCase
   */
  private normalizeServiceCategory(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      salonId: row.salon_id,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  /**
   * Helper: Convert services row to camelCase
   */
  private normalizeService(row: any): any {
    if (!row) return row;
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

  /**
   * Helper: Convert service_addons row to camelCase
   */
  private normalizeServiceAddon(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      serviceId: row.service_id,
      salonId: row.salon_id,
      name: row.name,
      price: row.price,
      duration: row.duration,
      sortOrder: row.sort_order,
    };
  }

  /**
   * Helper: Convert staff row to camelCase
   */
  private normalizeStaff(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      salonId: row.salon_id,
      firstName: row.first_name,
      lastName: row.last_name,
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

  /**
   * Helper: Convert staff_work_hours row to camelCase
   */
  private normalizeStaffWorkHour(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      staffId: row.staff_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isOff: row.is_off === 1,
    };
  }

  /**
   * Helper: Convert appointments row to camelCase
   */
  private normalizeAppointment(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      salonId: row.salon_id,
      clientId: row.client_id,
      status: row.status,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      totalPrice: row.total_price,
      totalDuration: row.total_duration,
      tip: row.tip,
      notes: row.notes,
      internalNotes: row.internal_notes,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Helper: Convert appointment_services row to camelCase
   */
  private normalizeAppointmentService(row: any): any {
    if (!row) return row;
    const addons = row.addons ? JSON.parse(row.addons) : [];
    return {
      id: row.id,
      appointmentId: row.appointment_id,
      serviceId: row.service_id,
      staffId: row.staff_id,
      price: row.price,
      duration: row.duration,
      startTime: row.start_time,
      endTime: row.end_time,
      addons,
    };
  }

  /**
   * Helper: Convert clients row to camelCase
   */
  private normalizeClient(row: any): any {
    if (!row) return row;
    const tags = row.tags ? JSON.parse(row.tags) : [];
    return {
      id: row.id,
      salonId: row.salon_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      tags,
      notes: row.notes,
      source: row.source,
      totalVisits: row.total_visits,
      lastVisitAt: row.last_visit_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
