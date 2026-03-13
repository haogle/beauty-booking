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
}
