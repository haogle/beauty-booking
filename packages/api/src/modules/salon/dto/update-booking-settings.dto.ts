import { IsOptional, IsInt, IsBoolean, IsString, IsArray } from 'class-validator';

export class UpdateBookingSettingsDto {
  @IsOptional()
  @IsInt()
  bufferMinutes?: number;

  @IsOptional()
  @IsInt()
  minAdvanceMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reminderBefore?: string[];

  @IsOptional()
  @IsBoolean()
  allowMultiService?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultiPerson?: boolean;

  @IsOptional()
  @IsBoolean()
  smsVerification?: boolean;

  @IsOptional()
  @IsString()
  notificationPhone?: string;

  @IsOptional()
  @IsString()
  notificationEmail?: string;

  @IsOptional()
  @IsString()
  assignmentStrategy?: string;

  @IsOptional()
  @IsBoolean()
  allowGenderFilter?: boolean;
}
