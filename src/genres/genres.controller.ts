import { Controller, Get } from "@nestjs/common";
import { GenresService } from "./genres.service";

@Controller("genres")
export class GenresController {
    constructor(private genresService: GenresService) {}

    // GET /api/v1/genres
    @Get()
    findAll() {
        return this.genresService.findAll();
    }
}
