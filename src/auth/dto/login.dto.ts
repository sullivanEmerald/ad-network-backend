import { IsEmail, IsString } from "class-validator";

export class LoginDto {
    @IsEmail()
    businessEmail!: string;

    @IsString()
    password!: string;
}
