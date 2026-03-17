import {
  Controller,
  Get,
  Put,
  Patch,
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
    // Merchant admin sees all services including inactive ones
    return this.salonService.getServices(user.salonId, true);
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('staffId') staffId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salonService.getAppointments(user.salonId, {
      date,
      startDate,
      endDate,
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

  /**
   * PATCH /appointments/:id/confirm - Confirm an appointment
   */
  @Patch('/appointments/:id/confirm')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async confirmAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.confirmAppointment(user.salonId, id);
  }

  /**
   * PATCH /appointments/:id/checkin - Check in an appointment
   */
  @Patch('/appointments/:id/checkin')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async checkinAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.checkinAppointment(user.salonId, id);
  }

  /**
   * PATCH /appointments/:id/complete - Complete an appointment
   */
  @Patch('/appointments/:id/complete')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async completeAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.completeAppointment(user.salonId, id);
  }

  /**
   * PATCH /appointments/:id/cancel - Cancel an appointment with optional reason
   */
  @Patch('/appointments/:id/cancel')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async cancelAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data?: { reason?: string },
  ) {
    return this.salonService.cancelAppointment(user.salonId, id, data?.reason);
  }

  /**
   * PATCH /appointments/:id/no-show - Mark appointment as no-show
   */
  @Patch('/appointments/:id/no-show')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async noShowAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.noShowAppointment(user.salonId, id);
  }

  /**
   * PATCH /appointments/:id/tip - Update appointment tip
   */
  @Patch('/appointments/:id/tip')
  @Roles('OWNER', 'RECEPTIONIST', 'TECHNICIAN')
  async updateAppointmentTip(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: { tip: number },
  ) {
    return this.salonService.updateAppointmentTip(user.salonId, id, data.tip);
  }

  /**
   * POST /appointments - Create appointment manually from calendar
   */
  @Post('/appointments')
  @Roles('OWNER', 'RECEPTIONIST')
  async createAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: any,
  ) {
    return this.salonService.createAppointment(user.salonId, data);
  }

  /**
   * PUT /appointments/:id - Update/modify appointment
   */
  @Put('/appointments/:id')
  @Roles('OWNER', 'RECEPTIONIST')
  async updateAppointment(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.salonService.updateAppointment(id, user.salonId, data);
  }

  // ============ TIME BLOCKS ============

  /**
   * GET /time-blocks - List time blocks with optional filters
   */
  @Get('/time-blocks')
  async getTimeBlocks(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.salonService.getTimeBlocks(user.salonId, {
      date,
      startDate,
      endDate,
      staffId,
    });
  }

  /**
   * POST /time-blocks - Create time block
   */
  @Post('/time-blocks')
  @Roles('OWNER', 'RECEPTIONIST')
  async createTimeBlock(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: any,
  ) {
    return this.salonService.createTimeBlock(user.salonId, data);
  }

  /**
   * PUT /time-blocks/:id - Update time block
   */
  @Put('/time-blocks/:id')
  @Roles('OWNER', 'RECEPTIONIST')
  async updateTimeBlock(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.salonService.updateTimeBlock(id, user.salonId, data);
  }

  /**
   * DELETE /time-blocks/:id - Delete time block
   */
  @Delete('/time-blocks/:id')
  @Roles('OWNER', 'RECEPTIONIST')
  async deleteTimeBlock(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteTimeBlock(id, user.salonId);
  }

  // ============ CLIENT/CUSTOMER MANAGEMENT ============

  /**
   * GET /clients - List clients with search and pagination
   */
  @Get('/clients')
  async getClients(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salonService.getClients(user.salonId, { search, page, limit });
  }

  /**
   * GET /clients/:id - Get single client
   */
  @Get('/clients/:id')
  async getClient(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.getClient(id, user.salonId);
  }

  /**
   * POST /clients - Create a new client
   */
  @Post('/clients')
  async createClient(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: any,
  ) {
    return this.salonService.createClient(user.salonId, data);
  }

  /**
   * PUT /clients/:id - Update client
   */
  @Put('/clients/:id')
  async updateClient(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.salonService.updateClient(id, user.salonId, data);
  }

  /**
   * DELETE /clients/:id - Delete client
   */
  @Delete('/clients/:id')
  @Roles('OWNER')
  async deleteClient(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteClient(id, user.salonId);
  }

  /**
   * GET /clients/:id/appointments - Get client appointment history
   */
  @Get('/clients/:id/appointments')
  async getClientAppointments(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') clientId: string,
  ) {
    return this.salonService.getClientAppointments(clientId, user.salonId);
  }

  // ============ GIFT CARDS ============

  @Get('/gift-card-categories')
  async getGiftCardCategories(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getGiftCardCategories(user.salonId);
  }

  @Post('/gift-card-categories')
  @Roles('OWNER')
  async createGiftCardCategory(@CurrentUserDecorator() user: CurrentUser, @Body() data: any) {
    return this.salonService.createGiftCardCategory(user.salonId, data);
  }

  @Put('/gift-card-categories/:id')
  @Roles('OWNER')
  async updateGiftCardCategory(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() data: any) {
    return this.salonService.updateGiftCardCategory(id, user.salonId, data);
  }

  @Delete('/gift-card-categories/:id')
  @Roles('OWNER')
  async deleteGiftCardCategory(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.salonService.deleteGiftCardCategory(id, user.salonId);
  }

  @Get('/gift-card-products')
  async getGiftCardProducts(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getGiftCardProducts(user.salonId);
  }

  @Get('/gift-card-products/:id')
  async getGiftCardProduct(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.salonService.getGiftCardProductById(id, user.salonId);
  }

  @Post('/gift-card-products')
  @Roles('OWNER')
  async createGiftCardProduct(@CurrentUserDecorator() user: CurrentUser, @Body() data: any) {
    return this.salonService.createGiftCardProduct(user.salonId, data);
  }

  @Put('/gift-card-products/:id')
  @Roles('OWNER')
  async updateGiftCardProduct(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string, @Body() data: any) {
    return this.salonService.updateGiftCardProduct(id, user.salonId, data);
  }

  @Delete('/gift-card-products/:id')
  @Roles('OWNER')
  async deleteGiftCardProduct(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.salonService.deleteGiftCardProduct(id, user.salonId);
  }

  @Post('/gift-cards/issue')
  async issueGiftCard(@CurrentUserDecorator() user: CurrentUser, @Body() data: any) {
    return this.salonService.issueGiftCard(user.salonId, data);
  }

  @Get('/gift-cards/issued')
  async getIssuedGiftCards(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salonService.getIssuedGiftCards(user.salonId, { search, page, limit });
  }

  @Get('/gift-cards/:serialNo')
  async getGiftCardInstance(@CurrentUserDecorator() user: CurrentUser, @Param('serialNo') serialNo: string) {
    return this.salonService.getGiftCardInstance(serialNo, user.salonId);
  }

  @Post('/gift-cards/redeem')
  async redeemGiftCard(@CurrentUserDecorator() user: CurrentUser, @Body() data: any) {
    return this.salonService.redeemGiftCard(user.salonId, data);
  }

  // ============ DASHBOARD STATS ============

  /**
   * GET /dashboard - Return dashboard statistics
   */
  @Get('/dashboard')
  async getDashboardStats(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getDashboardStats(user.salonId);
  }

  // ============ WEBSITE CONFIG ============

  /**
   * GET /website-config - Get website configuration
   */
  @Get('/website-config')
  async getWebsiteConfig(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.getWebsiteConfig(user.salonId);
  }

  /**
   * PUT /website-config - Update website configuration
   */
  @Put('/website-config')
  async updateWebsiteConfig(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: any,
  ) {
    return this.salonService.updateWebsiteConfig(user.salonId, data);
  }

  /**
   * POST /website-config/publish - Publish website (trigger rebuild)
   */
  @Post('/website-config/publish')
  async publishWebsite(@CurrentUserDecorator() user: CurrentUser) {
    return this.salonService.publishWebsite(user.salonId);
  }

  // ============ MEDIA LIBRARY ============

  /**
   * GET /media - List media files
   */
  @Get('/media')
  async listMedia(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('folder') folder?: string,
  ) {
    return this.salonService.listMedia(user.salonId, folder);
  }

  /**
   * POST /media - Upload media file (accepts base64 or URL)
   */
  @Post('/media')
  async uploadMedia(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() data: any,
  ) {
    return this.salonService.uploadMedia(user.salonId, data);
  }

  /**
   * DELETE /media/:id - Delete media file
   */
  @Delete('/media/:id')
  async deleteMedia(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.salonService.deleteMedia(user.salonId, id);
  }
}
