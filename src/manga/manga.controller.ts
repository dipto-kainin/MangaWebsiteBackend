import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { MangaService } from "./manga.service";
import { QueryMangaDto } from "./dto/query-manga.dto";

@Controller("manga")
export class MangaController {
    constructor(private mangaService: MangaService) {}

    // GET /api/v1/manga
    @Get()
    findAll(@Query() query: QueryMangaDto) {
        return this.mangaService.findAll(query);
    }

    // GET /api/v1/manga/:slug
    @Get(":slug")
    findOne(@Param("slug") slug: string) {
        return this.mangaService.findBySlug(slug);
    }

    // POST /api/v1/manga/:slug/view
    @Post(":slug/view")
    @HttpCode(204)
    async view(@Param("slug") slug: string) {
        await this.mangaService.incrementView(slug);
    }
}
