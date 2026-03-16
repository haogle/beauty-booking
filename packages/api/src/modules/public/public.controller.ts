import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api/v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /**
   * Get salon info by subdomain
   * GET /api/v1/public/salon/:subdomain
   */
  @Get('salon/:subdomain')
  async getSalon(@Param('subdomain') subdomain: string) {
    return this.publicService.getSalonBySubdomain(subdomain);
  }

  /**
   * Get services grouped by category
   * GET /api/v1/public/salon/:subdomain/services
   */
  @Get('salon/:subdomain/services')
  async getServices(@Param('subdomain') subdomain: string) {
    const salon = await this.publicService.getSalonBySubdomain(subdomain);
    return this.publicService.getServicesBySalon(salon.id);
  }

  /**
   * Get staff list
   * GET /api/v1/public/salon/:subdomain/staff
   */
  @Get('salon/:subdomain/staff')
  async getStaff(@Param('subdomain') subdomain: string) {
    const salon = await this.publicService.getSalonBySubdomain(subdomain);
    return this.publicService.getStaffBySalon(salon.id);
  }

  /**
   * Get available time slots
   * GET /api/v1/public/salon/:subdomain/availability?date=YYYY-MM-DD&serviceId=xxx&staffId=xxx
   */
  @Get('salon/:subdomain/availability')
  async getAvailability(
    @Param('subdomain') subdomain: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
    @Query('staffId') staffId?: string,
  ) {
    if (!date || !serviceId) {
      throw new BadRequestException('date and serviceId are required');
    }
    const salon = await this.publicService.getSalonBySubdomain(subdomain);
    return this.publicService.getAvailability(salon.id, date, serviceId, staffId);
  }

  /**
   * Create a booking
   * POST /api/v1/public/salon/:subdomain/book
   */
  @Post('salon/:subdomain/book')
  async createBooking(
    @Param('subdomain') subdomain: string,
    @Body() dto: CreateBookingDto,
  ) {
    const salon = await this.publicService.getSalonBySubdomain(subdomain);
    return this.publicService.createBooking(salon.id, dto);
  }
}
