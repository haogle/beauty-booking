import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSpecialHourDto {
  @IsString()
  date: string; // ISO date string: YYYY-MM-DD

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsOptional()
  @IsString()
  openTime?: string;

  @IsOptional()
  @IsString()
  closeTime?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
