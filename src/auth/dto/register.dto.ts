import { IsEmail, IsIn, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
    @IsString()
    @MinLength(2)
    @MaxLength(80)
    firstName!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(80)
    lastName!: string;

    @IsEmail()
    businessEmail!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(120)
    organizationName!: string;

    @IsIn(["advertiser", "publisher"])
    accountType!: "advertiser" | "publisher";

    @IsString()
    @MinLength(8, { message: "Password must be at least 8 characters" })
    @MaxLength(128)
    password!: string;

}
