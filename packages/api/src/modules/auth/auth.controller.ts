import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, SwitchSalonDto } from './dto/login.dto';

@Controller('api/v1/merchant/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/merchant/auth/login
   * Login with username and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  /**
   * POST /api/v1/merchant/auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  /**
   * POST /api/v1/merchant/auth/switch-salon
   * Switch to a different salon
   */
  @Post('switch-salon')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchSalon(
    @Request() req: any,
    @Body() switchSalonDto: SwitchSalonDto,
  ) {
    const userId = req.user.userId;
    return this.authService.switchSalon(userId, switchSalonDto.salonId);
  }
}
