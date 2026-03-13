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

  @Get('salons/:id')
  async getSalon(@Param('id') id: string) {
    return this.platformService.getSalon(id);
  }
}
