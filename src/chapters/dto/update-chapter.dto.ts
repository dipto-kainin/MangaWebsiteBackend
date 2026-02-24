import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateChapterDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    number?: number;

    @IsOptional()
    @IsString()
    title?: string;
}
