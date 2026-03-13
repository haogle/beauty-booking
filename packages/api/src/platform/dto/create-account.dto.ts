import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsUUID()
  customerId: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
