import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateServiceAddonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
