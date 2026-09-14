
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export class CreatePublisherDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    contactName!: string;

    @IsEmail()
    @IsNotEmpty()
    emailAddress!: string;

    @IsUrl({
        require_protocol: true,
    })
    @IsNotEmpty()
    website!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    comments?: string;
}

