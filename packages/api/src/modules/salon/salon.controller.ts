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
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateServiceAddonDto,
  UpdateServiceAddonDto,
  CreateStaffDto,
  UpdateStaffDto,
  AssignStaffServicesDto,
  UpdateStaffWorkHoursDto,
  UpdateAppointmentStatusDto,
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

  // ============ SERVICES MANAGEMENT ============

  /**
   * GET /services - List all services grouped by category with addons
   */
  @Get('/services')
  async getServices(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getServices(user.salonId);
  }

  /**
   * POST /service-categories - Create a service category
   */
  @Post('/service-categories')
  @Roles('OWNER')
  async createServiceCategory(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: CreateServiceCategoryDto,
  ) {
    return this.salonService.createServiceCategory(user.salonId, data);
  }

  /**
   * PUT /service-categories/:id - Update category
   */
  @Put('/service-categories/:id')
  @Roles('OWNER')
  async updateServiceCategory(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateServiceCategoryDto,
  ) {
    return this.salonService.updateServiceCategory(id, user.salonId, data);
  }

  /**
   * DELETE /service-categories/:id - Delete category
   */
  @Delete('/service-categories/:id')
  @Roles('OWNER')
  async deleteServiceCategory(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteServiceCategory(id, user.salonId);
  }

  /**
   * POST /services - Create a service
   */
  @Post('/services')
  @Roles('OWNER')
  async createService(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: CreateServiceDto,
  ) {
    return this.salonService.createService(user.salonId, data);
  }

  /**
   * PUT /services/:id - Update a service
   */
  @Put('/services/:id')
  @Roles('OWNER')
  async updateService(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.salonService.updateService(id, user.salonId, data);
  }

  /**
   * DELETE /services/:id - Delete a service
   */
  @Delete('/services/:id')
  @Roles('OWNER')
  async deleteService(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteService(id, user.salonId);
  }

  /**
   * POST /services/:id/addons - Create addon for service
   */
  @Post('/services/:id/addons')
  @Roles('OWNER')
  async createServiceAddon(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') serviceId: string,
    @Body() data: CreateServiceAddonDto,
  ) {
    return this.salonService.createServiceAddon(serviceId, user.salonId, data);
  }

  /**
   * PUT /service-addons/:id - Update addon
   */
  @Put('/service-addons/:id')
  @Roles('OWNER')
  async updateServiceAddon(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateServiceAddonDto,
  ) {
    return this.salonService.updateServiceAddon(id, user.salonId, data);
  }

  /**
   * DELETE /service-addons/:id - Delete addon
   */
  @Delete('/service-addons/:id')
  @Roles('OWNER')
  async deleteServiceAddon(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteServiceAddon(id, user.salonId);
  }

  // ============ STAFF MANAGEMENT ============

  /**
   * GET /staff - List all staff with their services and work hours
   */
  @Get('/staff')
  async getStaff(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getStaff(user.salonId);
  }

  /**
   * POST /staff - Create staff member
   */
  @Post('/staff')
  @Roles('OWNER')
  async createStaff(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: CreateStaffDto,
  ) {
    return this.salonService.createStaff(user.salonId, data);
  }

  /**
   * PUT /staff/:id - Update staff member
   */
  @Put('/staff/:id')
  @Roles('OWNER')
  async updateStaff(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateStaffDto,
  ) {
    return this.salonService.updateStaff(id, user.salonId, data);
  }

  /**
   * DELETE /staff/:id - Deactivate staff
   */
  @Delete('/staff/:id')
  @Roles('OWNER')
  async deleteStaff(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteStaff(id, user.salonId);
  }

  /**
   * PUT /staff/:id/services - Assign services to staff
   */
  @Put('/staff/:id/services')
  @Roles('OWNER')
  async assignStaffServices(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') staffId: string,
    @Body() data: AssignStaffServicesDto,
  ) {
    return this.salonService.assignStaffServices(staffId, user.salonId, data.serviceIds);
  }

  /**
   * PUT /staff/:id/work-hours - Update staff work hours
   */
  @Put('/staff/:id/work-hours')
  @Roles('OWNER', 'RECEPTIONIST')
  async updateStaffWorkHours(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') staffId: string,
    @Body() data: UpdateStaffWorkHoursDto,
  ) {
    return this.salonService.updateStaffWorkHours(staffId, user.salonId, data.hours);
  }

  // ============ APPOINTMENTS MANAGEMENT ============

  /**
   * GET /appointments - List appointments with filters
   */
  @Get('/appointments')
  async getAppointments(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('staffId') staffId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salonService.getAppointments(user.salonId, {
      date,
      status,
      staffId,
      page,
      limit,
    });
  }

  /**
   * GET /appointments/:id - Get single appointment with details
   */
  @Get('/appointments/:id')
  async getAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.getAppointment(id, user.salonId);
  }

  /**
   * PUT /appointments/:id/status - Update appointment status
   */
  @Put('/appointments/:id/status')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async updateAppointmentStatus(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: UpdateAppointmentStatusDto,
  ) {
    return this.salonService.updateAppointmentStatus(id, user.salonId, data.status);
  }

  // ============ DASHBOARD STATS ============

  /**
   * GET /dashboard/stats - Return dashboard statistics
   */
  @Get('/dashboard/stats')
  async getDashboardStats(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getDashboardStats(user.salonId);
  }
}
