
import {
    IsNotEmpty,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export class CreateCreativeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsUrl({
        require_protocol: true,
    })
    @IsNotEmpty()
    destinationUrl!: string;
}

