import { IsArray, IsString } from 'class-validator';

export class AssignStaffServicesDto {
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];
}
