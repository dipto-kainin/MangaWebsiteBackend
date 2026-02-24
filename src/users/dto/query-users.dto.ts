import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class QueryUsersDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsIn(["READER", "MODERATOR", "ADMIN"])
    role?: "READER" | "MODERATOR" | "ADMIN";
}
