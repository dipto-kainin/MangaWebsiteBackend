import {
    Body,
    Controller,
    Delete,
    HttpCode,
    Param,
    Patch,
    Post,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ChaptersService } from "./chapters.service";
import { CreateChapterDto } from "./dto/create-chapter.dto";
import { UpdateChapterDto } from "./dto/update-chapter.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MODERATOR")
export class AdminChaptersController {
    constructor(private chaptersService: ChaptersService) {}

    // POST /api/v1/admin/manga/:slug/chapters
    @Post("manga/:slug/chapters")
    @UseInterceptors(FilesInterceptor("pages[]", 200))
    async create(
        @Param("slug") slug: string,
        @Body() dto: CreateChapterDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.chaptersService.create(slug, dto, files ?? []);
    }

    // PATCH /api/v1/admin/chapters/:chapterId
    @Patch("chapters/:chapterId")
    @UseInterceptors(FilesInterceptor("pages[]", 200))
    async update(
        @Param("chapterId") chapterId: string,
        @Body() dto: UpdateChapterDto,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.chaptersService.update(chapterId, dto, files);
    }

    // DELETE /api/v1/admin/chapters/:chapterId
    @Delete("chapters/:chapterId")
    @HttpCode(204)
    async remove(@Param("chapterId") chapterId: string) {
        await this.chaptersService.remove(chapterId);
    }
}
