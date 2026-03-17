import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class PublicService {
  constructor(private db: DatabaseService) {}

  /**
   * Get salon by subdomain (public)
   */
  async getSalonBySubdomain(subdomain: string) {
    const salon = await this.db.get(
      'SELECT * FROM salons WHERE subdomain = ? AND status = ?',
      [subdomain, 'ACTIVE'],
    );

    if (!salon) {
      throw new NotFoundException(`Salon not found`);
    }

    // Get business hours
    const hours = await this.db.all(
      'SELECT * FROM business_hours WHERE salon_id = ? ORDER BY day_of_week ASC',
      [salon.id],
    );

    // Get booking settings
    const bookingSettings = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salon.id],
    );

    return {
      id: salon.id,
      name: salon.name,
      phone: salon.phone,
      email: salon.email,
      logoUrl: salon.logo_url,
      addressLine1: salon.address_line1,
      addressLine2: salon.address_line2,
      city: salon.city,
      state: salon.state,
      zipCode: salon.zip_code,
      country: salon.country,
      subdomain: salon.subdomain,
      timezone: salon.timezone,
      businessHours: hours.map((h) => ({
        dayOfWeek: h.day_of_week,
        openTime: h.open_time,
        closeTime: h.close_time,
        isClosed: h.is_closed === 1,
      })),
      bookingSettings: bookingSettings
        ? {
            bufferMinutes: bookingSettings.buffer_minutes,
            minAdvanceMinutes: bookingSettings.min_advance_minutes,
            allowMultiService: bookingSettings.allow_multi_service === 1,
            allowMultiPerson: bookingSettings.allow_multi_person === 1,
            allowGenderFilter: bookingSettings.allow_gender_filter === 1,
          }
        : null,
    };
  }

  /**
   * Get services grouped by category for a salon
   */
  async getServicesBySalon(salonId: string) {
    const categories = await this.db.all(
      'SELECT * FROM service_categories WHERE salon_id = ? AND is_active = 1 ORDER BY sort_order ASC',
      [salonId],
    );

    const services = await this.db.all(
      'SELECT * FROM services WHERE salon_id = ? AND is_active = 1 ORDER BY sort_order ASC',
      [salonId],
    );

    // Get addons for all services
    const serviceIds = services.map((s) => s.id);
    let addons: any[] = [];
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(',');
      addons = await this.db.all(
        `SELECT * FROM service_addons WHERE service_id IN (${placeholders}) ORDER BY sort_order ASC`,
        serviceIds,
      );
    }

    // Group addons by serviceId
    const addonsByService: Record<string, any[]> = {};
    for (const addon of addons) {
      if (!addonsByService[addon.service_id]) {
        addonsByService[addon.service_id] = [];
      }
      addonsByService[addon.service_id].push({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        duration: addon.duration,
      });
    }

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      services: services
        .filter((s) => s.category_id === cat.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          coverImageUrl: s.cover_image_url,
          techCount: s.tech_count || 1,
          isMultiTech: s.is_multi_tech === 1,
          addons: addonsByService[s.id] || [],
        })),
    }));
  }

  /**
   * Get active staff for a salon
   */
  async getStaffBySalon(salonId: string, gender?: string) {
    let query = 'SELECT * FROM staff WHERE salon_id = ? AND is_active = 1 AND role != ? ORDER BY sort_order ASC';
    let params: any[] = [salonId, 'OWNER'];

    if (gender) {
      query = 'SELECT * FROM staff WHERE salon_id = ? AND is_active = 1 AND role != ? AND gender = ? ORDER BY sort_order ASC';
      params = [salonId, 'OWNER', gender];
    }

    const staff = await this.db.all(query, params);

    // Get staff-service mappings
    const staffIds = staff.map((s) => s.id);
    let staffServices: any[] = [];
    if (staffIds.length > 0) {
      const placeholders = staffIds.map(() => '?').join(',');
      staffServices = await this.db.all(
        `SELECT ss.staff_id, ss.service_id FROM staff_services ss WHERE ss.staff_id IN (${placeholders})`,
        staffIds,
      );
    }

    // Group services by staffId
    const servicesByStaff: Record<string, string[]> = {};
    for (const ss of staffServices) {
      if (!servicesByStaff[ss.staff_id]) {
        servicesByStaff[ss.staff_id] = [];
      }
      servicesByStaff[ss.staff_id].push(ss.service_id);
    }

    return staff.map((s) => ({
      id: s.id,
      name: s.name,
      gender: s.gender,
      avatarUrl: s.avatar_url,
      bio: s.bio,
      role: s.role,
      serviceIds: servicesByStaff[s.id] || [],
    }));
  }

  /**
   * Get available time slots for a specific date, service, and optionally staff
   */
  async getAvailability(
    salonId: string,
    date: string,
    serviceId: string,
    staffId?: string,
    gender?: string,
    totalDuration?: number,
  ) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    // Get the service
    const service = await this.db.get(
      'SELECT * FROM services WHERE id = ? AND salon_id = ?',
      [serviceId, salonId],
    );
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const duration = totalDuration || service.duration; // in minutes

    // Get booking settings
    const bookingSettings = await this.db.get(
      'SELECT * FROM booking_settings WHERE salon_id = ?',
      [salonId],
    );
    const bufferMinutes = bookingSettings?.buffer_minutes || 0;
    const minAdvanceMinutes = bookingSettings?.min_advance_minutes || 60;

    // Get day of week (0=Sunday, 6=Saturday)
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // Check for special hours on this date
    const specialHour = await this.db.get(
      'SELECT * FROM special_hours WHERE salon_id = ? AND date = ?',
      [salonId, date],
    );

    let salonOpen: string;
    let salonClose: string;

    if (specialHour) {
      if (specialHour.is_closed === 1) {
        return { date, slots: [], message: 'Salon is closed on this date' };
      }
      salonOpen = specialHour.open_time;
      salonClose = specialHour.close_time;
    } else {
      // Check regular business hours
      const businessHour = await this.db.get(
        'SELECT * FROM business_hours WHERE salon_id = ? AND day_of_week = ?',
        [salonId, dayOfWeek],
      );

      if (!businessHour || businessHour.is_closed === 1) {
        return { date, slots: [], message: 'Salon is closed on this day' };
      }
      salonOpen = businessHour.open_time;
      salonClose = businessHour.close_time;
    }

    // Get eligible staff
    let eligibleStaff: any[];
    if (staffId) {
      const staff = await this.db.get(
        'SELECT * FROM staff WHERE id = ? AND salon_id = ? AND is_active = 1',
        [staffId, salonId],
      );
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }
      // Check if staff provides this service
      const staffService = await this.db.get(
        'SELECT * FROM staff_services WHERE staff_id = ? AND service_id = ?',
        [staffId, serviceId],
      );
      if (!staffService) {
        return { date, slots: [], message: 'Selected staff does not provide this service' };
      }
      eligibleStaff = [staff];
    } else {
      // Get all staff that provide this service
      let query = `SELECT s.* FROM staff s
         JOIN staff_services ss ON s.id = ss.staff_id
         WHERE ss.service_id = ? AND s.salon_id = ? AND s.is_active = 1`;
      let queryParams: any[] = [serviceId, salonId];

      if (gender) {
        query = `SELECT s.* FROM staff s
         JOIN staff_services ss ON s.id = ss.staff_id
         WHERE ss.service_id = ? AND s.salon_id = ? AND s.is_active = 1 AND s.gender = ?`;
        queryParams = [serviceId, salonId, gender];
      }

      const staffWithService = await this.db.all(query, queryParams);
      eligibleStaff = staffWithService;
    }

    if (eligibleStaff.length === 0) {
      return { date, slots: [], message: 'No staff available for this service' };
    }

    // For each eligible staff, calculate available slots
    const allSlots: { time: string; staffId: string; staffName: string }[] = [];

    for (const staff of eligibleStaff) {
      // Get staff work hours for this day
      const workHour = await this.db.get(
        'SELECT * FROM staff_work_hours WHERE staff_id = ? AND day_of_week = ?',
        [staff.id, dayOfWeek],
      );

      // If staff has work hours set and is off, skip
      if (workHour && workHour.is_off === 1) continue;

      const staffStart = workHour ? workHour.start_time : salonOpen;
      const staffEnd = workHour ? workHour.end_time : salonClose;

      // Get existing appointments for this staff on this date
      const appointments = await this.db.all(
        `SELECT aps.start_time, aps.end_time FROM appointment_services aps
         JOIN appointments a ON aps.appointment_id = a.id
         WHERE aps.staff_id = ? AND a.date = ? AND a.status IN ('PENDING', 'CONFIRMED')`,
        [staff.id, date],
      );

      // Get time blocks (unavailability)
      const timeBlocks = await this.db.all(
        'SELECT start_time, end_time FROM time_blocks WHERE staff_id = ? AND date = ?',
        [staff.id, date],
      );

      // Build busy intervals
      const busyIntervals = [
        ...appointments.map((a) => ({ start: a.start_time, end: a.end_time })),
        ...timeBlocks.map((b) => ({ start: b.start_time, end: b.end_time })),
      ];

      // Generate slots
      const startMinutes = this.timeToMinutes(staffStart);
      const endMinutes = this.timeToMinutes(staffEnd);

      for (let m = startMinutes; m + duration <= endMinutes; m += 15) {
        const slotStart = this.minutesToTime(m);
        const slotEnd = this.minutesToTime(m + duration);

        // Check if slot conflicts with any busy interval (including buffer)
        const hasConflict = busyIntervals.some((busy) => {
          const busyStart = this.timeToMinutes(busy.start) - bufferMinutes;
          const busyEnd = this.timeToMinutes(busy.end) + bufferMinutes;
          const slotStartMin = this.timeToMinutes(slotStart);
          const slotEndMin = this.timeToMinutes(slotEnd);
          return slotStartMin < busyEnd && slotEndMin > busyStart;
        });

        if (!hasConflict) {
          // Check advance booking requirement
          const now = new Date();
          const slotDateTime = new Date(`${date}T${slotStart}:00`);
          const minutesUntilSlot = (slotDateTime.getTime() - now.getTime()) / 60000;

          if (minutesUntilSlot >= minAdvanceMinutes) {
            allSlots.push({
              time: slotStart,
              staffId: staff.id,
              staffName: staff.name,
            });
          }
        }
      }
    }

    // Deduplicate by time, keeping all staff options
    const slotMap = new Map<string, { time: string; staff: { id: string; name: string }[] }>();
    for (const slot of allSlots) {
      if (!slotMap.has(slot.time)) {
        slotMap.set(slot.time, { time: slot.time, staff: [] });
      }
      slotMap.get(slot.time)!.staff.push({ id: slot.staffId, name: slot.staffName });
    }

    const slots = Array.from(slotMap.values()).sort((a, b) => a.time.localeCompare(b.time));

    return { date, slots };
  }

  /**
   * Create a booking (public - no auth required)
   */
  async createBooking(
    salonId: string,
    data: {
      serviceId: string;
      staffId: string;
      date: string;
      time: string;
      clientName: string;
      clientPhone: string;
      clientEmail?: string;
      notes?: string;
      addons?: string[];
    },
  ) {
    // Validate the service
    const service = await this.db.get(
      'SELECT * FROM services WHERE id = ? AND salon_id = ?',
      [data.serviceId, salonId],
    );
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate the staff
    const staff = await this.db.get(
      'SELECT * FROM staff WHERE id = ? AND salon_id = ? AND is_active = 1',
      [data.staffId, salonId],
    );
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    // Verify staff provides this service
    const staffService = await this.db.get(
      'SELECT * FROM staff_services WHERE staff_id = ? AND service_id = ?',
      [data.staffId, data.serviceId],
    );
    if (!staffService) {
      throw new BadRequestException('Selected staff does not provide this service');
    }

    // Calculate end time
    let totalDuration = service.duration;
    let totalPrice = service.price;

    // Process addons
    const addonDetails: any[] = [];
    if (data.addons && data.addons.length > 0) {
      for (const addonId of data.addons) {
        const addon = await this.db.get(
          'SELECT * FROM service_addons WHERE id = ? AND service_id = ?',
          [addonId, data.serviceId],
        );
        if (addon) {
          totalDuration += addon.duration;
          totalPrice += addon.price;
          addonDetails.push({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            duration: addon.duration,
          });
        }
      }
    }

    const startMinutes = this.timeToMinutes(data.time);
    const endTime = this.minutesToTime(startMinutes + totalDuration);

    // Verify the slot is still available
    const conflicts = await this.db.all(
      `SELECT aps.* FROM appointment_services aps
       JOIN appointments a ON aps.appointment_id = a.id
       WHERE aps.staff_id = ? AND a.date = ? AND a.status IN ('PENDING', 'CONFIRMED')
       AND aps.start_time < ? AND aps.end_time > ?`,
      [data.staffId, data.date, endTime, data.time],
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Find or create client
    const now = new Date().toISOString();
    let client = await this.db.get(
      'SELECT * FROM clients WHERE salon_id = ? AND phone = ?',
      [salonId, data.clientPhone],
    );

    if (!client) {
      const clientId = this.db.generateId();
      // Split name into first/last
      const nameParts = data.clientName.trim().split(' ');
      const firstName = nameParts[0] || data.clientName;
      const lastName = nameParts.slice(1).join(' ') || '';

      await this.db.run(
        `INSERT INTO clients (id, salon_id, first_name, last_name, phone, email, source, total_visits, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientId, salonId, firstName, lastName, data.clientPhone, data.clientEmail || null, 'WEBSITE', 0, now, now],
      );
      client = { id: clientId };
    }

    // Create appointment
    const appointmentId = this.db.generateId();
    await this.db.run(
      `INSERT INTO appointments (id, salon_id, client_id, status, source, date, start_time, end_time, total_price, total_duration, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentId, salonId, client.id, 'PENDING', 'WEBSITE',
        data.date, data.time, endTime, totalPrice, totalDuration,
        data.notes || null, now, now,
      ],
    );

    // Create appointment_service
    const appointmentServiceId = this.db.generateId();
    await this.db.run(
      `INSERT INTO appointment_services (id, appointment_id, service_id, staff_id, salon_id, price, duration, start_time, end_time, addons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentServiceId, appointmentId, data.serviceId, data.staffId, salonId,
        totalPrice, totalDuration, data.time, endTime, JSON.stringify(addonDetails),
      ],
    );

    return {
      appointmentId,
      status: 'PENDING',
      date: data.date,
      startTime: data.time,
      endTime,
      service: {
        name: service.name,
        price: service.price,
        duration: service.duration,
      },
      addons: addonDetails,
      staff: {
        id: staff.id,
        name: staff.name,
      },
      totalPrice,
      totalDuration,
    };
  }

  // Time helpers
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Get website config for public rendering
   */
  async getWebsiteConfig(salonId: string) {
    const row = await this.db.get<any>(
      'SELECT * FROM website_configs WHERE salon_id = ?',
      [salonId],
    );

    if (!row) {
      return null;
    }

    // Merge defaults for any empty stored values
    const defaultTheme = { primaryColor: '#8B5CF6', secondaryColor: '#EC4899', fontFamily: 'Inter', borderRadius: '8px' };
    const defaultNavbar = { logo: '', title: '', links: [
      { label: 'Home', href: '#hero', enabled: true },
      { label: 'Services', href: '#services', enabled: true },
      { label: 'About', href: '#about', enabled: true },
      { label: 'Gallery', href: '#gallery', enabled: true },
      { label: 'Contact', href: '#contact', enabled: true },
    ]};
    const defaultHero = { enabled: true, type: 'image', title: 'Welcome to Our Salon', subtitle: 'Your beauty is our passion', backgroundImage: '', ctaText: 'Book Now', ctaLink: '/book' };
    const defaultSections = [
      { id: 'services', type: 'services', enabled: true, title: 'Our Services', subtitle: 'What we offer', order: 0 },
      { id: 'about', type: 'about', enabled: true, title: 'About Us', subtitle: '', content: '', image: '', order: 1 },
      { id: 'gallery', type: 'gallery', enabled: true, title: 'Gallery', subtitle: 'Our work', images: [], order: 2 },
      { id: 'team', type: 'team', enabled: true, title: 'Our Team', subtitle: 'Meet our professionals', order: 3 },
      { id: 'testimonials', type: 'testimonials', enabled: false, title: 'Testimonials', subtitle: 'What our clients say', items: [], order: 4 },
      { id: 'contact', type: 'contact', enabled: true, title: 'Contact Us', subtitle: '', order: 5 },
    ];
    const defaultFooter = { enabled: true, text: '', showSocial: true, socialLinks: { facebook: '', instagram: '', twitter: '', tiktok: '' } };
    const defaultServicePage = { layout: 'grid', showPrices: true, showDuration: true, showDescription: true, coverImage: '' };
    const defaultSeo = { title: '', description: '', keywords: '', ogImage: '' };

    const storedTheme = this.parseJson(row.theme, {});
    const storedNavbar = this.parseJson(row.navbar, {});
    const storedHero = this.parseJson(row.hero, {});
    const storedSections = this.parseJson(row.sections, []);
    const storedFooter = this.parseJson(row.footer, {});
    const storedServicePage = this.parseJson(row.service_page, {});
    const storedSeo = this.parseJson(row.seo, {});

    return {
      theme: { ...defaultTheme, ...storedTheme },
      navbar: Object.keys(storedNavbar).length > 0 ? { ...defaultNavbar, ...storedNavbar } : defaultNavbar,
      announcement: row.announcement || '',
      hero: Object.keys(storedHero).length > 0 ? { ...defaultHero, ...storedHero } : defaultHero,
      sections: storedSections.length > 0 ? storedSections : defaultSections,
      footer: Object.keys(storedFooter).length > 0 ? { ...defaultFooter, ...storedFooter } : defaultFooter,
      servicePage: Object.keys(storedServicePage).length > 0 ? { ...defaultServicePage, ...storedServicePage } : defaultServicePage,
      seo: Object.keys(storedSeo).length > 0 ? { ...defaultSeo, ...storedSeo } : defaultSeo,
      publishedAt: row.published_at,
    };
  }

  private parseJson(value: any, defaultValue: any) {
    if (!value) return defaultValue;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
}
