import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdvertiserDto {
	@IsString()
	@MinLength(2)
	@MaxLength(150)
	name!: string;

	@IsEmail()
	@MinLength(2)
	@MaxLength(150)
	email!: string;
}
