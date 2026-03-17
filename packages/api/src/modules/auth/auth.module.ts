import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'beauty-booking-dev-secret-key-2026',
      signOptions: {
        expiresIn: '24h',
      },
    }),
  ],
  providers: [JwtStrategy, AuthService],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
