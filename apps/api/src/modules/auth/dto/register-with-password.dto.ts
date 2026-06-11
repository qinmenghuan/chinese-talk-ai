import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterWithPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword!: string;
}
