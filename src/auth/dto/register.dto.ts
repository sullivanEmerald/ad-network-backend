import { IsEmail, IsIn, IsString, IsUrl, MinLength, MaxLength, ValidateIf } from "class-validator";

export class RegisterDto {
    @IsIn(["advertiser", "publisher"])
    accountType!: "advertiser" | "publisher";

    @IsString()
    @MinLength(6, { message: "Password must be at least 8 characters" })
    @MaxLength(128)
    password!: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "publisher")
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    publisherName?: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "publisher")
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    contactName?: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "publisher")
    @IsEmail()
    publisherEmail?: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "publisher")
    @IsUrl({ require_protocol: true })
    website?: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "advertiser")
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    advertiserName?: string;

    @ValidateIf((dto: RegisterDto) => dto.accountType === "advertiser")
    @IsEmail()
    advertiserEmail?: string;

}
