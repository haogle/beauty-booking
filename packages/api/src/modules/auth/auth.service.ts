import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';

export interface TokenPayload {
  userId: string;
  accountId: string;
  salonId?: string;
  role: string;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
    salons: Array<{ id: string; name: string }>;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    // Find account by username
    const account = await this.db.get<any>(
      'SELECT a.*, c.name as customer_name FROM accounts a LEFT JOIN customers c ON a.customer_id = c.id WHERE a.username = ?',
      [username],
    );

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, account.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.db.run('UPDATE accounts SET last_login_at = ? WHERE id = ?', [
      new Date().toISOString(),
      account.id,
    ]);

    // Get staff record to get role
    const staff = await this.db.get<any>(
      'SELECT id, role, name FROM staff WHERE account_id = ?',
      [account.id],
    );

    if (!staff) {
      throw new NotFoundException('Staff record not found for this account');
    }

    // Get salons associated with this account
    const salons = await this.db.all<any>(
      'SELECT id, name FROM salons WHERE account_id = ? AND status = ?',
      [account.id, 'ACTIVE'],
    );

    // Get permissions for the role
    const permissions = this.getPermissionsForRole(staff.role);

    // Generate tokens
    const payload = {
      userId: staff.id,
      accountId: account.id,
      salonId: salons.length > 0 ? salons[0].id : undefined,
      role: staff.role,
      permissions,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        salons,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'beauty-booking-dev-refresh-secret-2026',
      }) as TokenPayload;

      // Verify account still exists and is active
      const account = await this.db.get<any>(
        'SELECT id, status FROM accounts WHERE id = ?',
        [payload.accountId],
      );

      if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      // Verify staff still exists
      const staff = await this.db.get<any>(
        'SELECT role FROM staff WHERE id = ?',
        [payload.userId],
      );

      if (!staff) {
        throw new UnauthorizedException('Staff record not found');
      }

      // Generate new access token (exclude JWT metadata fields like iat/exp from old token)
      const newPayload = {
        userId: payload.userId,
        accountId: payload.accountId,
        salonId: payload.salonId,
        role: staff.role,
        permissions: this.getPermissionsForRole(staff.role),
      };

      const accessToken = this.generateAccessToken(newPayload);

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Switch salon for the current user
   */
  async switchSalon(userId: string, salonId: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Get staff record
    const staff = await this.db.get<any>(
      'SELECT id, account_id, role, name FROM staff WHERE id = ?',
      [userId],
    );

    if (!staff) {
      throw new NotFoundException('Staff record not found');
    }

    // Verify user has access to this salon
    const salon = await this.db.get<any>(
      'SELECT id, name FROM salons WHERE id = ? AND account_id = ? AND status = ?',
      [salonId, staff.account_id, 'ACTIVE'],
    );

    if (!salon) {
      throw new BadRequestException('No access to this salon');
    }

    // Generate new tokens with new salon
    const permissions = this.getPermissionsForRole(staff.role);

    const payload = {
      userId: staff.id,
      accountId: staff.account_id,
      salonId,
      role: staff.role,
      permissions,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token
   */
  private generateAccessToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'beauty-booking-dev-secret-key-2026',
      expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'beauty-booking-dev-refresh-secret-2026',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });
  }

  /**
   * Get permissions based on role
   */
  getPermissionsForRole(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      OWNER: [
        'manage_staff',
        'manage_services',
        'manage_appointments',
        'manage_clients',
        'manage_settings',
        'manage_salons',
        'manage_accounts',
        'view_reports',
        'manage_bookings',
        'manage_gift_cards',
        'manage_website',
        'manage_media',
      ],
      RECEPTIONIST: [
        'manage_appointments',
        'manage_clients',
        'view_services',
        'manage_bookings',
        'manage_gift_cards',
        'view_staff',
      ],
      TECHNICIAN: [
        'view_appointments',
        'view_clients',
        'view_services',
        'manage_availability',
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcryptjs.hash(password, saltRounds);
  }

  /**
   * Validate password
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }
}
