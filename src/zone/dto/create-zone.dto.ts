import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

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
    @IsString()
    @MaxLength(500)
    comments?: string;
}