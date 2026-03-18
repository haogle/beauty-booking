import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformService } from './platform.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateSalonDto } from './dto/create-salon.dto';

@Controller('api/v1/platform')
@UseGuards(AuthGuard('jwt'))
export class PlatformController {
  constructor(private platformService: PlatformService) {}

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  @Get('dashboard')
  async getDashboardStats() {
    return this.platformService.getDashboardStats();
  }

  // ============================================================================
  // CUSTOMER ENDPOINTS
  // ============================================================================

  @Get('customers')
  async listCustomers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
  ) {
    const p = page || 1;
    const ps = pageSize || 10;

    if (p < 1 || ps < 1) {
      throw new BadRequestException('page and pageSize must be greater than 0');
    }

    return this.platformService.listCustomers(p, ps, search);
  }

  @Get('customers/:id')
  async getCustomer(@Param('id') id: string) {
    return this.platformService.getCustomer(id);
  }

  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.platformService.createCustomer(dto);
  }

  @Put('customers/:id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.platformService.updateCustomer(id, dto);
  }

  @Delete('customers/:id')
  async deleteCustomer(@Param('id') id: string) {
    return this.platformService.deleteCustomer(id);
  }

  // ============================================================================
  // ACCOUNT ENDPOINTS
  // ============================================================================

  @Get('accounts')
  async listAccounts(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    const p = page || 1;
    const ps = pageSize || 10;

    if (p < 1 || ps < 1) {
      throw new BadRequestException('page and pageSize must be greater than 0');
    }

    return this.platformService.listAccounts(p, ps, search, customerId);
  }

  @Get('accounts/:id')
  async getAccount(@Param('id') id: string) {
    return this.platformService.getAccount(id);
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.platformService.createAccount(dto);
  }

  @Put('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.platformService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string) {
    return this.platformService.deleteAccount(id);
  }

  // ============================================================================
  // SALON ENDPOINTS
  // ============================================================================

  @Post('accounts/:accountId/salons')
  async createSalonForAccount(
    @Param('accountId') accountId: string,
    @Body() dto: CreateSalonDto,
  ) {
    return this.platformService.createSalonForAccount(accountId, dto);
  }

  @Get('accounts/:accountId/salons')
  async listSalonsForAccount(@Param('accountId') accountId: string) {
    return this.platformService.listSalonsForAccount(accountId);
  }

  // ============================================================================
  // ALL SALONS (CROSS-ACCOUNT)
  // ============================================================================

  @Get('salons')
  async listAllSalons(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const p = page || 1;
    const ps = pageSize || 10;
    return this.platformService.listAllSalons(p, ps, search, status);
  }

  @Put('salons/:id')
  async updateSalon(@Param('id') id: string, @Body() data: any) {
    return this.platformService.updateSalon(id, data);
  }

  @Get('salons/:id')
  async getSalon(@Param('id') id: string) {
    return this.platformService.getSalon(id);
  }

  @Get('salons/:id/services')
  async getSalonServices(@Param('id') id: string) {
    return this.platformService.getSalonServices(id);
  }

  @Get('salons/:id/staff')
  async getSalonStaff(@Param('id') id: string) {
    return this.platformService.getSalonStaff(id);
  }

  @Get('salons/:id/bookings')
  async getSalonBookings(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 20;
    return this.platformService.getSalonBookings(id, p, ps);
  }

  // ============================================================================
  // CUSTOMER ACCOUNTS
  // ============================================================================

  @Get('customers/:id/accounts')
  async getCustomerAccounts(@Param('id') id: string) {
    return this.platformService.getCustomerAccounts(id);
  }

  // ============================================================================
  // SERVICE CATEGORIES
  // ============================================================================

  @Post('salons/:salonId/service-categories')
  async createServiceCategory(
    @Param('salonId') salonId: string,
    @Body() data: { name: string; sortOrder?: number },
  ) {
    return this.platformService.createServiceCategory(salonId, data);
  }

  @Put('salons/:salonId/service-categories/:catId')
  async updateServiceCategory(
    @Param('salonId') salonId: string,
    @Param('catId') catId: string,
    @Body() data: { name?: string; sortOrder?: number },
  ) {
    return this.platformService.updateServiceCategory(salonId, catId, data);
  }

  @Delete('salons/:salonId/service-categories/:catId')
  async deleteServiceCategory(
    @Param('salonId') salonId: string,
    @Param('catId') catId: string,
  ) {
    return this.platformService.deleteServiceCategory(salonId, catId);
  }

  // ============================================================================
  // SERVICES
  // ============================================================================

  @Post('salons/:salonId/services')
  async createService(
    @Param('salonId') salonId: string,
    @Body() data: any,
  ) {
    return this.platformService.createService(salonId, data);
  }

  @Put('salons/:salonId/services/:serviceId')
  async updateService(
    @Param('salonId') salonId: string,
    @Param('serviceId') serviceId: string,
    @Body() data: any,
  ) {
    return this.platformService.updateService(salonId, serviceId, data);
  }

  @Delete('salons/:salonId/services/:serviceId')
  async deleteService(
    @Param('salonId') salonId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.platformService.deleteService(salonId, serviceId);
  }

  // ============================================================================
  // STAFF MANAGEMENT
  // ============================================================================

  @Post('salons/:salonId/staff')
  async createStaff(
    @Param('salonId') salonId: string,
    @Body() data: any,
  ) {
    return this.platformService.createStaff(salonId, data);
  }

  @Put('salons/:salonId/staff/:staffId')
  async updateStaff(
    @Param('salonId') salonId: string,
    @Param('staffId') staffId: string,
    @Body() data: any,
  ) {
    return this.platformService.updateStaff(salonId, staffId, data);
  }

  @Delete('salons/:salonId/staff/:staffId')
  async deleteStaff(
    @Param('salonId') salonId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.platformService.deleteStaff(salonId, staffId);
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  @Put('salons/:salonId/business-hours')
  async updateBusinessHours(
    @Param('salonId') salonId: string,
    @Body() hours: any,
  ) {
    return this.platformService.updateBusinessHours(salonId, hours);
  }

  @Put('salons/:salonId/booking-settings')
  async updateBookingSettings(
    @Param('salonId') salonId: string,
    @Body() data: any,
  ) {
    return this.platformService.updateBookingSettings(salonId, data);
  }

  // ============================================================================
  // APPOINTMENTS
  // ============================================================================

  @Put('salons/:salonId/appointments/:aptId/status')
  async updateAppointmentStatus(
    @Param('salonId') salonId: string,
    @Param('aptId') aptId: string,
    @Body() data: { status: string },
  ) {
    return this.platformService.updateAppointmentStatus(salonId, aptId, data.status);
  }
}
