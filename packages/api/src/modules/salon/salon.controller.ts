import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  UseGuards,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SalonService } from './salon.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUser as CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import {
  UpdateSalonDto,
  UpdateBusinessHoursDto,
  CreateSpecialHourDto,
  UpdateSpecialHourDto,
  UpdateBookingSettingsDto,
} from './dto';

@Controller('api/v1/merchant/salon')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalonController {
  constructor(private readonly salonService: SalonService) {}

  /**
   * GET / - Get salon info
   */
  @Get('/')
  async getSalon(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getSalon(user.salonId);
  }

  /**
   * PUT / - Update salon profile (Owner only)
   */
  @Put('/')
  @Roles('OWNER')
  async updateSalon(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: UpdateSalonDto,
  ) {
    return this.salonService.updateSalon(user.salonId, data);
  }

  /**
   * GET /business-hours - Get all business hours
   */
  @Get('/business-hours')
  async getBusinessHours(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getBusinessHours(user.salonId);
  }

  /**
   * PUT /business-hours - Update business hours (Owner only)
   */
  @Put('/business-hours')
  @Roles('OWNER')
  async updateBusinessHours(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: UpdateBusinessHoursDto,
  ) {
    return this.salonService.updateBusinessHours(user.salonId, data.hours);
  }

  /**
   * GET /special-hours - Get special hours (with optional date range filter)
   */
  @Get('/special-hours')
  async getSpecialHours(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salonService.getSpecialHours(user.salonId, from, to);
  }

  /**
   * POST /special-hours - Create special hour (Owner only)
   */
  @Post('/special-hours')
  @Roles('OWNER')
  async createSpecialHour(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: CreateSpecialHourDto,
  ) {
    return this.salonService.createSpecialHour(user.salonId, data);
  }

  /**
   * PUT /special-hours/:id - Update special hour (Owner only)
   */
  @Put('/special-hours/:id')
  @Roles('OWNER')
  async updateSpecialHour(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateSpecialHourDto,
  ) {
    return this.salonService.updateSpecialHour(id, user.salonId, data);
  }

  /**
   * DELETE /special-hours/:id - Delete special hour (Owner only)
   */
  @Delete('/special-hours/:id')
  @Roles('OWNER')
  async deleteSpecialHour(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteSpecialHour(id, user.salonId);
  }

  /**
   * GET /booking-settings - Get booking settings
   */
  @Get('/booking-settings')
  async getBookingSettings(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getBookingSettings(user.salonId);
  }

  /**
   * PUT /booking-settings - Update booking settings (Owner or Receptionist)
   */
  @Put('/booking-settings')
  @Roles('OWNER', 'RECEPTIONIST')
  async updateBookingSettings(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: UpdateBookingSettingsDto,
  ) {
    return this.salonService.updateBookingSettings(user.salonId, data);
  }
}
