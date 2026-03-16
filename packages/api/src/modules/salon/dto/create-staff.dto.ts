import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsIn } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsIn(['OWNER', 'TECHNICIAN', 'RECEPTIONIST'])
  role: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
