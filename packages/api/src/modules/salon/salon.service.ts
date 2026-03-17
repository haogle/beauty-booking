import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as crypto from 'crypto';

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

interface ClientInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  source?: string;
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
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const sql = `
      INSERT INTO staff
      (id, salon_id, name, email, phone, role, bio, avatar_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    await this.db.run(sql, [
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

    if (data.firstName !== undefined || data.lastName !== undefined) {
      // Staff table uses single 'name' column - combine first + last
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
    filters: { date?: string; startDate?: string; endDate?: string; status?: string; staffId?: string; page?: number; limit?: number },
  ) {
    // Verify salon exists
    await this.getSalon(salonId);

    let whereSql = 'WHERE salon_id = ?';
    const whereParams: any[] = [salonId];

    if (filters.date) {
      whereSql += ' AND date = ?';
      whereParams.push(filters.date);
    }
    if (filters.startDate) {
      whereSql += ' AND date >= ?';
      whereParams.push(filters.startDate);
    }
    if (filters.endDate) {
      whereSql += ' AND date <= ?';
      whereParams.push(filters.endDate);
    }
    if (filters.status) {
      whereSql += ' AND status = ?';
      whereParams.push(filters.status);
    }
    if (filters.staffId) {
      whereSql += ' AND id IN (SELECT appointment_id FROM appointment_services WHERE staff_id = ?)';
      whereParams.push(filters.staffId);
    }

    // Get total count
    const countRow = await this.db.get(`SELECT COUNT(*) as count FROM appointments ${whereSql}`, whereParams);
    const total = parseInt(String(countRow?.count || 0), 10);

    // Add pagination (query params may arrive as strings)
    const page = parseInt(String(filters.page), 10) || 1;
    const limit = parseInt(String(filters.limit), 10) || 50;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    let sql = `SELECT * FROM appointments ${whereSql} ORDER BY date DESC, start_time DESC LIMIT ? OFFSET ?`;
    const params = [...whereParams, limit, offset];

    const appointments = await this.db.all(sql, params);

    // Get services, client info, staff info for each appointment
    const result = [];
    for (const apt of appointments) {
      const aptServices = await this.db.all(
        'SELECT * FROM appointment_services WHERE appointment_id = ?',
        [apt.id],
      );

      // Get client name
      let clientName = 'Unknown';
      if (apt.client_id) {
        const client = await this.db.get('SELECT first_name, last_name FROM clients WHERE id = ?', [apt.client_id]);
        if (client) clientName = `${client.first_name} ${client.last_name}`.trim();
      }

      // Get primary service name and staff name from first appointment_service
      let serviceName = 'Walk-in';
      let staffName = 'Unassigned';
      let staffId = '';
      let serviceId = '';
      let duration = apt.total_duration || 0;
      if (aptServices.length > 0) {
        const firstSvc = aptServices[0];
        if (firstSvc.service_id) {
          serviceId = firstSvc.service_id;
          const svc = await this.db.get('SELECT name FROM services WHERE id = ?', [firstSvc.service_id]);
          if (svc) serviceName = svc.name;
        }
        if (firstSvc.staff_id) {
          staffId = firstSvc.staff_id;
          const staff = await this.db.get('SELECT name FROM staff WHERE id = ?', [firstSvc.staff_id]);
          if (staff) staffName = staff.name || 'Unassigned';
        }
      } else {
        // Fallback: try to recover service/staff info from appointment context
        // Check if appointment_services were lost — show price-based label
        if (apt.total_price > 0) {
          serviceName = `Service ($${Number(apt.total_price).toFixed(0)})`;
        }
      }

      result.push({
        ...this.normalizeAppointment(apt),
        clientName,
        serviceName,
        staffName,
        staffId,
        serviceId,
        duration,
        price: apt.total_price || 0,
        time: apt.start_time,
        services: aptServices.map(s => this.normalizeAppointmentService(s)),
      });
    }

    return {
      appointments: result,
      total,
      page,
      limit,
      totalPages,
    };
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
   * Confirm an appointment (set status to CONFIRMED)
   */
  async confirmAppointment(salonId: string, appointmentId: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
      ['CONFIRMED', now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  /**
   * Check in an appointment (set status to IN_PROGRESS)
   */
  async checkinAppointment(salonId: string, appointmentId: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
      ['IN_PROGRESS', now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  /**
   * Complete an appointment (set status to COMPLETED and set completed_at timestamp)
   */
  async completeAppointment(salonId: string, appointmentId: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      ['COMPLETED', now, now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  /**
   * Cancel an appointment (set status to CANCELLED, set cancelled_at timestamp, optionally store reason in internal_notes)
   */
  async cancelAppointment(salonId: string, appointmentId: string, reason?: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const now = new Date().toISOString();
    const internalNotes = reason ? (appointment.internal_notes ? `${appointment.internal_notes}\n[Cancelled: ${reason}]` : `[Cancelled: ${reason}]`) : appointment.internal_notes;

    await this.db.run(
      'UPDATE appointments SET status = ?, cancelled_at = ?, internal_notes = ?, updated_at = ? WHERE id = ?',
      ['CANCELLED', now, internalNotes, now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  /**
   * Mark appointment as no-show (set status to NO_SHOW)
   */
  async noShowAppointment(salonId: string, appointmentId: string) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
      ['NO_SHOW', now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  /**
   * Update appointment tip amount
   */
  async updateAppointmentTip(salonId: string, appointmentId: string, tip: number) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [appointmentId, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    if (tip < 0) {
      throw new BadRequestException('Tip amount cannot be negative');
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE appointments SET tip = ?, updated_at = ? WHERE id = ?',
      [tip, now, appointmentId],
    );

    const row = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return this.normalizeAppointment(row);
  }

  // ============ CLIENT/CUSTOMER MANAGEMENT ============

  /**
   * Get all clients with pagination and search
   */
  async getClients(
    salonId: string,
    filters: { search?: string; page?: number; limit?: number },
  ) {
    await this.getSalon(salonId);

    let whereSql = 'WHERE salon_id = ?';
    const whereParams: any[] = [salonId];

    if (filters.search) {
      whereSql += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      whereParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countRow = await this.db.get(`SELECT COUNT(*) as count FROM clients ${whereSql}`, whereParams);
    const total = parseInt(String(countRow?.count || 0), 10);

    const page = parseInt(String(filters.page), 10) || 1;
    const limit = parseInt(String(filters.limit), 10) || 50;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const sql = `SELECT * FROM clients ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const params = [...whereParams, limit, offset];

    const clients = await this.db.all(sql, params);

    return {
      clients: clients.map(c => this.normalizeClient(c)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single client by ID
   */
  async getClient(id: string, salonId: string) {
    const client = await this.db.get(
      'SELECT * FROM clients WHERE id = ? AND salon_id = ?',
      [id, salonId],
    );

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return this.normalizeClient(client);
  }

  /**
   * Create a new client
   */
  async createClient(salonId: string, data: ClientInput) {
    await this.getSalon(salonId);

    if (!data.firstName) {
      throw new BadRequestException('firstName is required');
    }

    const id = this.db.generateId();
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO clients
      (id, salon_id, first_name, last_name, phone, email, notes, tags, source, total_visits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `;
    await this.db.run(sql, [
      id,
      salonId,
      data.firstName,
      data.lastName || '',
      data.phone || null,
      data.email || null,
      data.notes || null,
      data.tags ? JSON.stringify(data.tags) : '[]',
      data.source || 'MANUAL',
      now,
      now,
    ]);

    const row = await this.db.get('SELECT * FROM clients WHERE id = ?', [id]);
    return this.normalizeClient(row);
  }

  /**
   * Update an existing client
   */
  async updateClient(id: string, salonId: string, data: Partial<ClientInput>) {
    const client = await this.db.get('SELECT * FROM clients WHERE id = ?', [id]);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (client.salon_id !== salonId) {
      throw new BadRequestException('Client does not belong to this salon');
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
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (updates.length === 0) {
      return this.normalizeClient(client);
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);

    const row = await this.db.get('SELECT * FROM clients WHERE id = ?', [id]);
    return this.normalizeClient(row);
  }

  /**
   * Delete a client
   */
  async deleteClient(id: string, salonId: string) {
    const client = await this.db.get('SELECT * FROM clients WHERE id = ?', [id]);

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    if (client.salon_id !== salonId) {
      throw new BadRequestException('Client does not belong to this salon');
    }

    await this.db.run('DELETE FROM clients WHERE id = ?', [id]);
    return this.normalizeClient(client);
  }

  /**
   * Get appointment history for a client
   */
  async getClientAppointments(clientId: string, salonId: string) {
    // Verify client belongs to salon
    const client = await this.db.get(
      'SELECT * FROM clients WHERE id = ? AND salon_id = ?',
      [clientId, salonId],
    );

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const appointments = await this.db.all(
      'SELECT * FROM appointments WHERE client_id = ? AND salon_id = ? ORDER BY date DESC, start_time DESC',
      [clientId, salonId],
    );

    const result = [];
    for (const apt of appointments) {
      const aptServices = await this.db.all(
        'SELECT * FROM appointment_services WHERE appointment_id = ?',
        [apt.id],
      );

      let serviceName = 'Unknown';
      let staffName = 'Unknown';
      if (aptServices.length > 0) {
        const firstSvc = aptServices[0];
        if (firstSvc.service_id) {
          const svc = await this.db.get('SELECT name FROM services WHERE id = ?', [firstSvc.service_id]);
          if (svc) serviceName = svc.name;
        }
        if (firstSvc.staff_id) {
          const staff = await this.db.get('SELECT name FROM staff WHERE id = ?', [firstSvc.staff_id]);
          if (staff) staffName = staff.name || 'Unknown';
        }
      }

      result.push({
        ...this.normalizeAppointment(apt),
        serviceName,
        staffName,
        duration: apt.total_duration || 0,
      });
    }

    return result;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(salonId: string) {
    // Verify salon exists
    await this.getSalon(salonId);

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Today's revenue (completed appointments only)
    const todayRevenueRow = await this.db.get(
      `SELECT SUM(total_price) as total FROM appointments
       WHERE salon_id = ? AND date = ? AND status = 'COMPLETED'`,
      [salonId, today],
    );
    const todayRevenue = todayRevenueRow?.total || 0;

    // Today's appointments (all statuses)
    const todayAppointmentsRow = await this.db.get(
      `SELECT COUNT(*) as count FROM appointments
       WHERE salon_id = ? AND date = ?`,
      [salonId, today],
    );
    const todayAppointments = todayAppointmentsRow?.count || 0;

    // Week revenue (last 7 days, completed appointments only)
    const weekRevenueRow = await this.db.get(
      `SELECT SUM(total_price) as total FROM appointments
       WHERE salon_id = ? AND date >= ? AND date <= ? AND status = 'COMPLETED'`,
      [salonId, sevenDaysAgo, today],
    );
    const weekRevenue = weekRevenueRow?.total || 0;

    // Total clients
    const totalClientsRow = await this.db.get(
      `SELECT COUNT(*) as count FROM clients WHERE salon_id = ?`,
      [salonId],
    );
    const totalClients = totalClientsRow?.count || 0;

    // Recent appointments (last 5, ordered by date descending)
    const recentApts = await this.db.all(
      `SELECT * FROM appointments
       WHERE salon_id = ?
       ORDER BY date DESC, start_time DESC
       LIMIT 5`,
      [salonId],
    );

    const recentAppointments = [];
    for (const apt of recentApts) {
      const client = await this.db.get(`SELECT first_name, last_name FROM clients WHERE id = ?`, [
        apt.client_id,
      ]);
      const clientName = client
        ? `${client.first_name} ${client.last_name}`.trim()
        : 'Unknown';

      // Get first service and staff info
      const aptService = await this.db.get(
        `SELECT service_id, staff_id FROM appointment_services WHERE appointment_id = ? LIMIT 1`,
        [apt.id],
      );

      let serviceName = 'Unknown';
      let staffName = 'Unknown';
      if (aptService) {
        if (aptService.service_id) {
          const svc = await this.db.get(`SELECT name FROM services WHERE id = ?`, [
            aptService.service_id,
          ]);
          serviceName = svc?.name || 'Unknown';
        }
        if (aptService.staff_id) {
          const staff = await this.db.get(`SELECT name FROM staff WHERE id = ?`, [
            aptService.staff_id,
          ]);
          staffName = staff?.name || 'Unknown';
        }
      }

      recentAppointments.push({
        id: apt.id,
        clientName,
        serviceName,
        staffName,
        status: apt.status,
        date: apt.date,
        time: apt.start_time,
        price: apt.total_price,
      });
    }

    // Upcoming appointments (next 5, today or future, PENDING or CONFIRMED status)
    const upcomingApts = await this.db.all(
      `SELECT * FROM appointments
       WHERE salon_id = ? AND date >= ? AND status IN ('PENDING', 'CONFIRMED')
       ORDER BY date ASC, start_time ASC
       LIMIT 5`,
      [salonId, today],
    );

    const upcomingAppointments = [];
    for (const apt of upcomingApts) {
      const client = await this.db.get(`SELECT first_name, last_name FROM clients WHERE id = ?`, [
        apt.client_id,
      ]);
      const clientName = client
        ? `${client.first_name} ${client.last_name}`.trim()
        : 'Unknown';

      // Get first service and staff info
      const aptService = await this.db.get(
        `SELECT service_id, staff_id FROM appointment_services WHERE appointment_id = ? LIMIT 1`,
        [apt.id],
      );

      let serviceName = 'Unknown';
      let staffName = 'Unknown';
      if (aptService) {
        if (aptService.service_id) {
          const svc = await this.db.get(`SELECT name FROM services WHERE id = ?`, [
            aptService.service_id,
          ]);
          serviceName = svc?.name || 'Unknown';
        }
        if (aptService.staff_id) {
          const staff = await this.db.get(`SELECT name FROM staff WHERE id = ?`, [
            aptService.staff_id,
          ]);
          staffName = staff?.name || 'Unknown';
        }
      }

      upcomingAppointments.push({
        id: apt.id,
        clientName,
        serviceName,
        staffName,
        status: apt.status,
        date: apt.date,
        time: apt.start_time,
        price: apt.total_price,
      });
    }

    return {
      todayRevenue,
      todayAppointments,
      weekRevenue,
      totalClients,
      recentAppointments,
      upcomingAppointments,
    };
  }

  // ============ GIFT CARD MANAGEMENT ============

  /**
   * Get all gift card categories
   */
  async getGiftCardCategories(salonId: string) {
    const categories = await this.db.all(
      'SELECT * FROM gift_card_categories WHERE salon_id = ? ORDER BY sort_order ASC',
      [salonId],
    );
    return categories.map(c => ({
      id: c.id,
      salonId: c.salon_id,
      name: c.name,
      sortOrder: c.sort_order,
      createdAt: c.created_at,
    }));
  }

  /**
   * Create gift card category
   */
  async createGiftCardCategory(salonId: string, data: { name: string; sortOrder?: number }) {
    const id = this.db.generateId();
    await this.db.run(
      'INSERT INTO gift_card_categories (id, salon_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, salonId, data.name, data.sortOrder ?? 0, new Date().toISOString()],
    );
    const row = await this.db.get('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
    return { id: row.id, salonId: row.salon_id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at };
  }

  /**
   * Update gift card category
   */
  async updateGiftCardCategory(id: string, salonId: string, data: { name?: string; sortOrder?: number }) {
    const cat = await this.db.get('SELECT * FROM gift_card_categories WHERE id = ? AND salon_id = ?', [id, salonId]);
    if (!cat) throw new NotFoundException('Gift card category not found');

    const updates: string[] = [];
    const params: any[] = [];
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(data.sortOrder); }
    if (updates.length === 0) return cat;

    params.push(id);
    await this.db.run(`UPDATE gift_card_categories SET ${updates.join(', ')} WHERE id = ?`, params);
    const row = await this.db.get('SELECT * FROM gift_card_categories WHERE id = ?', [id]);
    return { id: row.id, salonId: row.salon_id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at };
  }

  /**
   * Delete gift card category
   */
  async deleteGiftCardCategory(id: string, salonId: string) {
    const cat = await this.db.get('SELECT * FROM gift_card_categories WHERE id = ? AND salon_id = ?', [id, salonId]);
    if (!cat) throw new NotFoundException('Gift card category not found');
    await this.db.run('DELETE FROM gift_card_categories WHERE id = ?', [id]);
    return { success: true };
  }

  /**
   * Get all gift card products with their items
   */
  async getGiftCardProducts(salonId: string) {
    const products = await this.db.all(
      'SELECT * FROM gift_card_products WHERE salon_id = ? ORDER BY sort_order ASC',
      [salonId],
    );

    const result = [];
    for (const p of products) {
      const items = await this.db.all(
        `SELECT gpi.*, s.name as service_name, s.price as service_price, s.duration as service_duration
         FROM gift_card_product_items gpi
         LEFT JOIN services s ON gpi.service_id = s.id
         WHERE gpi.product_id = ?`,
        [p.id],
      );

      result.push({
        ...this.normalizeGiftCardProduct(p),
        items: items.map(i => ({
          id: i.id,
          serviceId: i.service_id,
          serviceName: i.service_name,
          servicePrice: i.service_price,
          serviceDuration: i.service_duration,
          quantity: i.quantity,
        })),
      });
    }

    return result;
  }

  /**
   * Create gift card product
   */
  async createGiftCardProduct(salonId: string, data: {
    name: string;
    type: 'AMOUNT' | 'ITEM';
    categoryId?: string;
    price: number;
    faceValue?: number;
    coverImageUrl?: string;
    fontColor?: string;
    validityDays?: number;
    items?: { serviceId: string; quantity: number }[];
  }) {
    const id = this.db.generateId();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO gift_card_products
       (id, salon_id, name, type, category_id, price, face_value, cover_image_url, font_color, validity_days, is_listed, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'DRAFT', 0, ?, ?)`,
      [id, salonId, data.name, data.type, data.categoryId || null, data.price,
       data.faceValue || null, data.coverImageUrl || null, data.fontColor || '#FFFFFF',
       data.validityDays || null, now, now],
    );

    // Add items for ITEM type
    if (data.type === 'ITEM' && data.items && data.items.length > 0) {
      for (const item of data.items) {
        const itemId = this.db.generateId();
        await this.db.run(
          'INSERT INTO gift_card_product_items (id, product_id, salon_id, service_id, quantity) VALUES (?, ?, ?, ?, ?)',
          [itemId, id, salonId, item.serviceId, item.quantity],
        );
      }
    }

    // Return with items
    return this.getGiftCardProductById(id, salonId);
  }

  /**
   * Get single gift card product
   */
  async getGiftCardProductById(id: string, salonId: string) {
    const p = await this.db.get('SELECT * FROM gift_card_products WHERE id = ? AND salon_id = ?', [id, salonId]);
    if (!p) throw new NotFoundException('Gift card product not found');

    const items = await this.db.all(
      `SELECT gpi.*, s.name as service_name, s.price as service_price, s.duration as service_duration
       FROM gift_card_product_items gpi
       LEFT JOIN services s ON gpi.service_id = s.id
       WHERE gpi.product_id = ?`,
      [id],
    );

    return {
      ...this.normalizeGiftCardProduct(p),
      items: items.map(i => ({
        id: i.id,
        serviceId: i.service_id,
        serviceName: i.service_name,
        servicePrice: i.service_price,
        serviceDuration: i.service_duration,
        quantity: i.quantity,
      })),
    };
  }

  /**
   * Update gift card product
   */
  async updateGiftCardProduct(id: string, salonId: string, data: {
    name?: string;
    categoryId?: string;
    price?: number;
    faceValue?: number;
    coverImageUrl?: string;
    fontColor?: string;
    validityDays?: number | null;
    isListed?: boolean;
    items?: { serviceId: string; quantity: number }[];
  }) {
    const p = await this.db.get('SELECT * FROM gift_card_products WHERE id = ? AND salon_id = ?', [id, salonId]);
    if (!p) throw new NotFoundException('Gift card product not found');

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId); }
    if (data.price !== undefined) { updates.push('price = ?'); params.push(data.price); }
    if (data.faceValue !== undefined) { updates.push('face_value = ?'); params.push(data.faceValue); }
    if (data.coverImageUrl !== undefined) { updates.push('cover_image_url = ?'); params.push(data.coverImageUrl); }
    if (data.fontColor !== undefined) { updates.push('font_color = ?'); params.push(data.fontColor); }
    if (data.validityDays !== undefined) { updates.push('validity_days = ?'); params.push(data.validityDays); }
    if (data.isListed !== undefined) { updates.push('is_listed = ?'); params.push(data.isListed ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      await this.db.run(`UPDATE gift_card_products SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update items if provided
    if (data.items !== undefined) {
      await this.db.run('DELETE FROM gift_card_product_items WHERE product_id = ?', [id]);
      for (const item of data.items) {
        const itemId = this.db.generateId();
        await this.db.run(
          'INSERT INTO gift_card_product_items (id, product_id, salon_id, service_id, quantity) VALUES (?, ?, ?, ?, ?)',
          [itemId, id, salonId, item.serviceId, item.quantity],
        );
      }
    }

    return this.getGiftCardProductById(id, salonId);
  }

  /**
   * Delete gift card product
   */
  async deleteGiftCardProduct(id: string, salonId: string) {
    const p = await this.db.get('SELECT * FROM gift_card_products WHERE id = ? AND salon_id = ?', [id, salonId]);
    if (!p) throw new NotFoundException('Gift card product not found');
    await this.db.run('DELETE FROM gift_card_product_items WHERE product_id = ?', [id]);
    await this.db.run('DELETE FROM gift_card_products WHERE id = ?', [id]);
    return { success: true };
  }

  /**
   * Issue a gift card (create instance)
   */
  async issueGiftCard(salonId: string, data: {
    productId: string;
    recipientPhone: string;
    recipientName?: string;
    senderName?: string;
    message?: string;
    buyerClientId?: string;
  }) {
    const product = await this.db.get(
      'SELECT * FROM gift_card_products WHERE id = ? AND salon_id = ?',
      [data.productId, salonId],
    );
    if (!product) throw new NotFoundException('Gift card product not found');
    if (!product.is_listed) throw new BadRequestException('Gift card product is not listed');

    const id = this.db.generateId();
    const serialNo = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    let expiresAt: string | null = null;
    if (product.validity_days) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + product.validity_days);
      expiresAt = expDate.toISOString().split('T')[0];
    }

    const originalValue = product.face_value || product.price;

    // For item-type cards, build remaining_items from product items
    let remainingItems = '[]';
    if (product.type === 'ITEM') {
      const productItems = await this.db.all(
        `SELECT gpi.service_id, gpi.quantity, s.name as service_name
         FROM gift_card_product_items gpi
         LEFT JOIN services s ON gpi.service_id = s.id
         WHERE gpi.product_id = ?`,
        [product.id],
      );
      remainingItems = JSON.stringify(productItems.map(pi => ({
        serviceId: pi.service_id,
        serviceName: pi.service_name,
        totalQuantity: pi.quantity,
        remainingQuantity: pi.quantity,
      })));
    }

    await this.db.run(
      `INSERT INTO gift_card_instances
       (id, salon_id, product_id, serial_no, recipient_name, recipient_phone, sender_name, message,
        original_value, remaining_value, remaining_items, buyer_client_id, status, issued_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [id, salonId, data.productId, serialNo, data.recipientName || null, data.recipientPhone,
       data.senderName || null, data.message || null, originalValue, originalValue,
       remainingItems, data.buyerClientId || null, now, expiresAt, now],
    );

    return this.getGiftCardInstance(serialNo, salonId);
  }

  /**
   * Get gift card instance by serial number
   */
  async getGiftCardInstance(serialNo: string, salonId: string) {
    const inst = await this.db.get(
      'SELECT * FROM gift_card_instances WHERE serial_no = ? AND salon_id = ?',
      [serialNo, salonId],
    );
    if (!inst) throw new NotFoundException('Gift card not found');

    const product = await this.db.get('SELECT * FROM gift_card_products WHERE id = ?', [inst.product_id]);
    const logs = await this.db.all(
      'SELECT * FROM gift_card_usage_logs WHERE instance_id = ? ORDER BY created_at DESC',
      [inst.id],
    );

    return {
      id: inst.id,
      serialNo: inst.serial_no,
      productId: inst.product_id,
      productName: product?.name || 'Unknown',
      productType: product?.type || 'AMOUNT',
      recipientName: inst.recipient_name,
      recipientPhone: inst.recipient_phone,
      senderName: inst.sender_name,
      message: inst.message,
      originalValue: inst.original_value,
      remainingValue: inst.remaining_value,
      remainingItems: inst.remaining_items ? JSON.parse(inst.remaining_items) : [],
      status: inst.status,
      issuedAt: inst.issued_at,
      expiresAt: inst.expires_at,
      createdAt: inst.created_at,
      buyerClientId: inst.buyer_client_id,
      redemptionLogs: logs.map(l => ({
        id: l.id,
        amount: l.amount,
        serviceId: l.service_id,
        itemQuantity: l.item_quantity,
        redemptionType: l.redemption_type,
        notes: l.notes,
        createdAt: l.created_at,
      })),
    };
  }

  /**
   * Redeem gift card (amount or item)
   */
  async redeemGiftCard(salonId: string, data: {
    serialNo: string;
    redemptionType: 'AMOUNT' | 'ITEM';
    amount?: number;
    serviceId?: string;
    itemQuantity?: number;
    notes?: string;
    operatorId?: string;
  }) {
    const inst = await this.db.get(
      'SELECT * FROM gift_card_instances WHERE serial_no = ? AND salon_id = ?',
      [data.serialNo, salonId],
    );
    if (!inst) throw new NotFoundException('Gift card not found');
    if (inst.status !== 'ACTIVE') throw new BadRequestException('Gift card is not active');

    // Check expiry
    if (inst.expires_at) {
      const today = new Date().toISOString().split('T')[0];
      if (today > inst.expires_at) throw new BadRequestException('Gift card has expired');
    }

    const logId = this.db.generateId();
    const now = new Date().toISOString();

    if (data.redemptionType === 'AMOUNT') {
      if (!data.amount || data.amount <= 0) throw new BadRequestException('Amount must be positive');
      if (data.amount > inst.remaining_value) throw new BadRequestException('Insufficient balance');

      const newBalance = inst.remaining_value - data.amount;
      await this.db.run(
        'UPDATE gift_card_instances SET remaining_value = ?, status = ? WHERE id = ?',
        [newBalance, newBalance <= 0 ? 'USED' : 'ACTIVE', inst.id],
      );

      await this.db.run(
        `INSERT INTO gift_card_usage_logs (id, instance_id, salon_id, amount, redemption_type, notes, operator_id, created_at)
         VALUES (?, ?, ?, ?, 'AMOUNT', ?, ?, ?)`,
        [logId, inst.id, salonId, data.amount, data.notes || null, data.operatorId || null, now],
      );
    } else {
      // ITEM redemption
      if (!data.serviceId || !data.itemQuantity) throw new BadRequestException('serviceId and itemQuantity are required');

      const remainingItems = inst.remaining_items ? JSON.parse(inst.remaining_items) : [];
      const itemIdx = remainingItems.findIndex((i: any) => i.serviceId === data.serviceId);
      if (itemIdx === -1) throw new BadRequestException('Service not found in this gift card');
      if (remainingItems[itemIdx].remainingQuantity < data.itemQuantity) {
        throw new BadRequestException('Insufficient item quantity');
      }

      remainingItems[itemIdx].remainingQuantity -= data.itemQuantity;

      // Check if all items are fully used
      const allUsed = remainingItems.every((i: any) => i.remainingQuantity <= 0);

      await this.db.run(
        'UPDATE gift_card_instances SET remaining_items = ?, status = ? WHERE id = ?',
        [JSON.stringify(remainingItems), allUsed ? 'USED' : 'ACTIVE', inst.id],
      );

      await this.db.run(
        `INSERT INTO gift_card_usage_logs (id, instance_id, salon_id, amount, redemption_type, service_id, item_quantity, notes, operator_id, created_at)
         VALUES (?, ?, ?, 0, 'ITEM', ?, ?, ?, ?, ?)`,
        [logId, inst.id, salonId, data.serviceId, data.itemQuantity, data.notes || null, data.operatorId || null, now],
      );
    }

    return this.getGiftCardInstance(data.serialNo, salonId);
  }

  /**
   * List all issued gift cards with search and pagination
   */
  async getIssuedGiftCards(salonId: string, filters: { search?: string; page?: number; limit?: number }) {
    let whereSql = 'WHERE gi.salon_id = ?';
    const whereParams: any[] = [salonId];

    if (filters.search) {
      whereSql += ' AND (gi.serial_no LIKE ? OR gi.recipient_name LIKE ? OR gi.recipient_phone LIKE ?)';
      const s = `%${filters.search}%`;
      whereParams.push(s, s, s);
    }

    const countRow = await this.db.get(
      `SELECT COUNT(*) as count FROM gift_card_instances gi ${whereSql}`,
      whereParams,
    );
    const total = parseInt(String(countRow?.count || 0), 10);
    const page = parseInt(String(filters.page), 10) || 1;
    const limit = parseInt(String(filters.limit), 10) || 20;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const instances = await this.db.all(
      `SELECT gi.*, gp.name as product_name, gp.type as product_type
       FROM gift_card_instances gi
       LEFT JOIN gift_card_products gp ON gi.product_id = gp.id
       ${whereSql}
       ORDER BY gi.created_at DESC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset],
    );

    return {
      cards: instances.map(i => ({
        id: i.id,
        serialNo: i.serial_no,
        productName: i.product_name,
        productType: i.product_type,
        recipientName: i.recipient_name,
        recipientPhone: i.recipient_phone,
        originalValue: i.original_value,
        remainingValue: i.remaining_value,
        remainingItems: i.remaining_items ? JSON.parse(i.remaining_items) : [],
        status: i.status,
        issuedAt: i.issued_at,
        expiresAt: i.expires_at,
        buyerClientId: i.buyer_client_id,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ============ TIME BLOCKS ============

  /**
   * Get time blocks with optional filters (date, dateRange, staffId)
   */
  async getTimeBlocks(
    salonId: string,
    filters: { date?: string; startDate?: string; endDate?: string; staffId?: string },
  ) {
    let whereSql = 'WHERE salon_id = ?';
    const whereParams: any[] = [salonId];

    if (filters.date) {
      whereSql += ' AND date = ?';
      whereParams.push(filters.date);
    }
    if (filters.startDate) {
      whereSql += ' AND date >= ?';
      whereParams.push(filters.startDate);
    }
    if (filters.endDate) {
      whereSql += ' AND date <= ?';
      whereParams.push(filters.endDate);
    }
    if (filters.staffId) {
      whereSql += ' AND staff_id = ?';
      whereParams.push(filters.staffId);
    }

    const timeBlocks = await this.db.all(`SELECT * FROM time_blocks ${whereSql} ORDER BY date, start_time`, whereParams);

    // Get staff names for each time block
    const result = [];
    for (const tb of timeBlocks) {
      let staffName = 'Unknown';
      if (tb.staff_id) {
        const staff = await this.db.get('SELECT name FROM staff WHERE id = ?', [tb.staff_id]);
        if (staff) staffName = staff.name;
      }
      result.push({
        id: tb.id,
        salonId: tb.salon_id,
        staffId: tb.staff_id,
        staffName,
        date: tb.date,
        startTime: tb.start_time,
        endTime: tb.end_time,
        reason: tb.reason,
        createdAt: tb.created_at,
      });
    }

    return result;
  }

  /**
   * Create a new time block
   */
  async createTimeBlock(salonId: string, data: any) {
    const { staffId, date, startTime, endTime, reason } = data;

    if (!staffId || !date || !startTime || !endTime) {
      throw new BadRequestException('staffId, date, startTime, and endTime are required');
    }

    // Verify staff exists and belongs to this salon
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ? AND salon_id = ?', [staffId, salonId]);
    if (!staff) {
      throw new NotFoundException(`Staff with ID ${staffId} not found`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO time_blocks (id, salon_id, staff_id, date, start_time, end_time, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, salonId, staffId, date, startTime, endTime, reason || null, now],
    );

    const row = await this.db.get('SELECT * FROM time_blocks WHERE id = ?', [id]);
    return {
      id: row.id,
      salonId: row.salon_id,
      staffId: row.staff_id,
      staffName: staff.name,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      createdAt: row.created_at,
    };
  }

  /**
   * Update a time block
   */
  async updateTimeBlock(id: string, salonId: string, data: any) {
    const timeBlock = await this.db.get('SELECT * FROM time_blocks WHERE id = ? AND salon_id = ?', [id, salonId]);

    if (!timeBlock) {
      throw new NotFoundException(`Time block with ID ${id} not found`);
    }

    const { date, startTime, endTime, reason } = data;
    const updates: string[] = [];
    const params: any[] = [];

    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(endTime);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason);
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    params.push(id);
    await this.db.run(`UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`, params);

    const row = await this.db.get('SELECT * FROM time_blocks WHERE id = ?', [id]);
    let staffName = 'Unknown';
    if (row.staff_id) {
      const staff = await this.db.get('SELECT name FROM staff WHERE id = ?', [row.staff_id]);
      if (staff) staffName = staff.name;
    }

    return {
      id: row.id,
      salonId: row.salon_id,
      staffId: row.staff_id,
      staffName,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      createdAt: row.created_at,
    };
  }

  /**
   * Delete a time block
   */
  async deleteTimeBlock(id: string, salonId: string) {
    const timeBlock = await this.db.get('SELECT * FROM time_blocks WHERE id = ? AND salon_id = ?', [id, salonId]);

    if (!timeBlock) {
      throw new NotFoundException(`Time block with ID ${id} not found`);
    }

    await this.db.run('DELETE FROM time_blocks WHERE id = ?', [id]);
    return { message: 'Time block deleted successfully' };
  }

  // ============ APPOINTMENT CREATION & MODIFICATION ============

  /**
   * Create a new appointment manually from calendar
   * Required: clientId, staffId, serviceId, date, startTime
   * Optional: notes, internalNotes
   */
  async createAppointment(salonId: string, data: any) {
    const { clientId, staffId, serviceId, date, startTime, notes, internalNotes } = data;

    if (!clientId || !staffId || !serviceId || !date || !startTime) {
      throw new BadRequestException(
        'clientId, staffId, serviceId, date, and startTime are required',
      );
    }

    // Verify client exists
    const client = await this.db.get('SELECT * FROM clients WHERE id = ? AND salon_id = ?', [clientId, salonId]);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Verify staff exists
    const staff = await this.db.get('SELECT * FROM staff WHERE id = ? AND salon_id = ?', [staffId, salonId]);
    if (!staff) {
      throw new NotFoundException(`Staff with ID ${staffId} not found`);
    }

    // Verify service exists and get price/duration
    const service = await this.db.get('SELECT * FROM services WHERE id = ? AND salon_id = ?', [serviceId, salonId]);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    // Calculate end time based on service duration
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = h * 60 + m + service.duration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const appointmentId = crypto.randomUUID();
    const appointmentServiceId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert appointment
    await this.db.run(
      `INSERT INTO appointments (id, salon_id, client_id, status, source, date, start_time, end_time,
       total_price, total_duration, notes, internal_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentId,
        salonId,
        clientId,
        'PENDING',
        'MANUAL',
        date,
        startTime,
        endTime,
        service.price,
        service.duration,
        notes || null,
        internalNotes || null,
        now,
        now,
      ],
    );

    // Insert appointment_services entry
    await this.db.run(
      `INSERT INTO appointment_services (id, appointment_id, service_id, staff_id, salon_id, price, duration, start_time, end_time, addons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [appointmentServiceId, appointmentId, serviceId, staffId, salonId, service.price, service.duration, startTime, endTime, '[]'],
    );

    // Fetch and return the created appointment with joined data
    const appointment = await this.db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);

    return {
      ...this.normalizeAppointment(appointment),
      clientName: `${client.first_name} ${client.last_name}`.trim(),
      serviceName: service.name,
      staffName: staff.name,
      services: [
        {
          id: appointmentServiceId,
          appointmentId,
          serviceId,
          staffId,
          price: service.price,
          duration: service.duration,
          startTime,
          endTime,
          addons: [],
        },
      ],
    };
  }

  /**
   * Update an appointment - can change staff, service, date/time, notes, etc.
   * If service changes, updates appointment_services as well
   * If time changes, recalculates end_time based on service duration
   */
  async updateAppointment(id: string, salonId: string, data: any) {
    const appointment = await this.db.get(
      'SELECT * FROM appointments WHERE id = ? AND salon_id = ?',
      [id, salonId],
    );

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    const { staffId, serviceId, date, startTime, notes, internalNotes } = data;

    // If changing service, verify it exists and get new duration/price
    let newService = null;
    if (serviceId) {
      newService = await this.db.get('SELECT * FROM services WHERE id = ? AND salon_id = ?', [serviceId, salonId]);
      if (!newService) {
        throw new NotFoundException(`Service with ID ${serviceId} not found`);
      }
    }

    // If changing staff, verify it exists
    if (staffId) {
      const staff = await this.db.get('SELECT * FROM staff WHERE id = ? AND salon_id = ?', [staffId, salonId]);
      if (!staff) {
        throw new NotFoundException(`Staff with ID ${staffId} not found`);
      }
    }

    // Calculate new end time if time or service changed
    let newEndTime = appointment.end_time;
    let finalStartTime = startTime || appointment.start_time;
    let durationToUse = appointment.total_duration;

    if (startTime || newService) {
      // Need to recalculate end time
      const timeToUse = startTime || appointment.start_time;
      durationToUse = newService ? newService.duration : appointment.total_duration;

      const [h, m] = timeToUse.split(':').map(Number);
      const totalMins = h * 60 + m + durationToUse;
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    // Update appointment
    const updates: string[] = [];
    const params: any[] = [];

    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(startTime);
    }
    if (startTime || newService) {
      updates.push('end_time = ?');
      params.push(newEndTime);
    }
    if (newService) {
      updates.push('total_price = ?');
      params.push(newService.price);
      updates.push('total_duration = ?');
      params.push(newService.duration);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (internalNotes !== undefined) {
      updates.push('internal_notes = ?');
      params.push(internalNotes);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      await this.db.run(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update appointment_services if service or staff changed
    if (serviceId || staffId) {
      const aptService = await this.db.get(
        'SELECT * FROM appointment_services WHERE appointment_id = ? LIMIT 1',
        [id],
      );

      if (aptService) {
        const serviceUpdates: string[] = [];
        const serviceParams: any[] = [];

        if (staffId) {
          serviceUpdates.push('staff_id = ?');
          serviceParams.push(staffId);
        }
        if (serviceId) {
          serviceUpdates.push('service_id = ?');
          serviceParams.push(serviceId);
          serviceUpdates.push('price = ?');
          serviceParams.push(newService.price);
          serviceUpdates.push('duration = ?');
          serviceParams.push(newService.duration);
        }
        if (startTime || newService) {
          serviceUpdates.push('start_time = ?');
          serviceParams.push(finalStartTime);
          serviceUpdates.push('end_time = ?');
          serviceParams.push(newEndTime);
        }

        if (serviceUpdates.length > 0) {
          serviceParams.push(aptService.id);
          await this.db.run(
            `UPDATE appointment_services SET ${serviceUpdates.join(', ')} WHERE id = ?`,
            serviceParams,
          );
        }
      }
    }

    // Fetch and return updated appointment
    const updatedApt = await this.db.get('SELECT * FROM appointments WHERE id = ?', [id]);
    const services = await this.db.all('SELECT * FROM appointment_services WHERE appointment_id = ?', [id]);
    const client = await this.db.get('SELECT * FROM clients WHERE id = ?', [updatedApt.client_id]);

    return {
      ...this.normalizeAppointment(updatedApt),
      clientName: client ? `${client.first_name} ${client.last_name}`.trim() : 'Unknown',
      services: services.map(s => this.normalizeAppointmentService(s)),
    };
  }

  private normalizeGiftCardProduct(row: any): any {
    if (!row) return row;
    return {
      id: row.id,
      salonId: row.salon_id,
      name: row.name,
      type: row.type,
      categoryId: row.category_id,
      price: row.price,
      faceValue: row.face_value,
      coverImageUrl: row.cover_image_url,
      fontColor: row.font_color,
      validityDays: row.validity_days,
      isListed: row.is_listed === 1 || row.is_listed === true,
      status: row.status,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
    // Staff table uses a single 'name' column, split into firstName/lastName for frontend
    const nameParts = (row.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      id: row.id,
      salonId: row.salon_id,
      name: row.name,
      firstName,
      lastName,
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
