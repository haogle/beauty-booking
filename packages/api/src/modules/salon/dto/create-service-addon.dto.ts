import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class CreateServiceAddonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  duration: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
