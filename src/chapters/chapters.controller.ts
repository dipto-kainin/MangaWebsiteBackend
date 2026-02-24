import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ChaptersService } from "./chapters.service";

@Controller("chapters")
export class ChaptersController {
    constructor(private chaptersService: ChaptersService) {}

    // GET /api/v1/chapters/:chapterId
    @Get(":chapterId")
    findOne(@Param("chapterId") chapterId: string) {
        return this.chaptersService.findById(chapterId);
    }

    // POST /api/v1/chapters/:chapterId/view
    @Post(":chapterId/view")
    @HttpCode(204)
    async view(@Param("chapterId") chapterId: string) {
        await this.chaptersService.incrementView(chapterId);
    }
}
