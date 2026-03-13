import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { SalonService } from './salon.service';
import { SalonController } from './salon.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SalonController],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
