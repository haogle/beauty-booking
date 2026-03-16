import { IsIn } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status: string;
}
