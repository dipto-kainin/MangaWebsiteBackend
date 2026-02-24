import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GenresService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        const genres = await this.prisma.genre.findMany({
            orderBy: { name: "asc" },
            select: { name: true },
        });
        return { data: genres.map((g) => g.name) };
    }
}
