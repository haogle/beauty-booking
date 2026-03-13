import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'beauty-booking-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
