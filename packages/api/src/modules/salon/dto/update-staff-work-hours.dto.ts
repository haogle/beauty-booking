import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class StaffWorkHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsBoolean()
  isOff: boolean;
}

export class UpdateStaffWorkHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffWorkHourItemDto)
  hours: StaffWorkHourItemDto[];
}
