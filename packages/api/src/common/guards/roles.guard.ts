import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Role hierarchy: OWNER > RECEPTIONIST > TECHNICIAN
const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 3,
  RECEPTIONIST: 2,
  TECHNICIAN: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    const userRoleLevel = ROLE_HIERARCHY[user.role];
    const requiredRoleLevel = Math.max(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role] || 0),
    );

    if (userRoleLevel >= requiredRoleLevel) {
      return true;
    }

    throw new ForbiddenException(
      `This endpoint requires one of the following roles: ${requiredRoles.join(', ')}`,
    );
  }
}
