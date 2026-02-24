import { IsInt, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateChapterDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    number: number;

    @IsString()
    title: string;
}
