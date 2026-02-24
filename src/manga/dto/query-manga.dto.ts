import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class QueryMangaDto {
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
    @IsIn(["latest", "trending", "rating"])
    sort?: "latest" | "trending" | "rating" = "latest";

    @IsOptional()
    @IsString()
    genre?: string;

    @IsOptional()
    @IsIn(["ongoing", "completed", "hiatus"])
    status?: "ongoing" | "completed" | "hiatus";

    @IsOptional()
    @IsString()
    q?: string;
}
