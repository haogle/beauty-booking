import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  duration: number;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}
