import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateMangaDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    author: string;

    @IsString()
    artist: string;

    @Type(() => Number)
    @IsInt()
    @Min(1900)
    publishedYear: number;

    @IsIn(["ongoing", "completed", "hiatus"])
    status: "ongoing" | "completed" | "hiatus";

    // Comes as a JSON string array in multipart or repeated field
    @IsOptional()
    genres?: string | string[];

    @IsOptional()
    tags?: string | string[];
}
