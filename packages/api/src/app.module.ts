import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { SalonModule } from './modules/salon/salon.module';
import { PublicModule } from './modules/public/public.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [DatabaseModule, AuthModule, PlatformModule, SalonModule, PublicModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
