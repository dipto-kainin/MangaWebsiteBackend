import {
    Body,
    Controller,
    Delete,
    HttpCode,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { MangaService } from "./manga.service";
import { CreateMangaDto } from "./dto/create-manga.dto";
import { UpdateMangaDto } from "./dto/update-manga.dto";

@Controller("admin/manga")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MODERATOR")
export class AdminMangaController {
    constructor(private mangaService: MangaService) {}

    // POST /api/v1/admin/manga
    @Post()
    @UseInterceptors(FileInterceptor("coverImage"))
    async create(@Body() dto: CreateMangaDto, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new Error("Cover image is required");
        }
        return this.mangaService.create(dto, file.buffer);
    }

    // PATCH /api/v1/admin/manga/:slug
    @Patch(":slug")
    @UseInterceptors(FileInterceptor("coverImage"))
    async update(
        @Param("slug") slug: string,
        @Body() dto: UpdateMangaDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.mangaService.update(slug, dto, file?.buffer);
    }

    // DELETE /api/v1/admin/manga/:slug — ADMIN only
    @Delete(":slug")
    @Roles("ADMIN")
    @HttpCode(204)
    async remove(@Param("slug") slug: string) {
        await this.mangaService.remove(slug);
    }
}
