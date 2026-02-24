import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
    @IsOptional()
    @IsIn(["READER", "MODERATOR", "ADMIN"])
    role?: "READER" | "MODERATOR" | "ADMIN";

    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string;
}
