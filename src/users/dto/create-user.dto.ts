import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsIn(["MODERATOR", "ADMIN"])
    role: "MODERATOR" | "ADMIN";
}
