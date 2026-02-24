import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateMangaDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    author?: string;

    @IsOptional()
    @IsString()
    artist?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1900)
    publishedYear?: number;

    @IsOptional()
    @IsIn(["ongoing", "completed", "hiatus"])
    status?: "ongoing" | "completed" | "hiatus";

    @IsOptional()
    genres?: string | string[];

    @IsOptional()
    tags?: string | string[];
}
