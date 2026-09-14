
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateCreativeDto {
    @IsString()
    name!: string;

    @IsUrl()
    destinationUrl!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    width?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    height?: number;
}

