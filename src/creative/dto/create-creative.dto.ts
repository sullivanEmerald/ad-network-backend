
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateCreativeDto {
    @IsString()
    name!: string;

    @IsUrl()
    destinationUrl!: string;

    @IsOptional()
    width?: string;

    @IsOptional()
    height?: string;
}

