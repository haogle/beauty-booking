import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestSalonId = request.params.salonId || request.body?.salonId || request.query?.salonId;

    if (!user || !user.salonId) {
      throw new ForbiddenException('User salonId not found in JWT');
    }

    if (requestSalonId && user.salonId !== requestSalonId) {
      throw new ForbiddenException(
        'You do not have access to this salon. Salon ID mismatch.',
      );
    }

    return true;
  }
}
