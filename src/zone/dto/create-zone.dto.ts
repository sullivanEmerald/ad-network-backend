import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { LinkingMode } from '../schema/zone.schema';

export class CreateZoneDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    type!: string;

    @IsInt()
    @Min(1)
    @Max(10000)
    width!: number;

    @IsInt()
    @Min(1)
    @Max(10000)
    height!: number;

    @IsOptional()
    @IsEnum(LinkingMode)
    mode?: LinkingMode;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    comments?: string;
}