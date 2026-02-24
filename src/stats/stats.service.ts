import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) {}

    async getDashboardStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalManga,
            totalChapters,
            viewsResult,
            newMangaThisMonth,
            newChaptersThisMonth,
            topManga,
        ] = await Promise.all([
            this.prisma.manga.count(),
            this.prisma.chapter.count(),
            this.prisma.manga.aggregate({ _sum: { views: true } }),
            this.prisma.manga.count({ where: { createdAt: { gte: startOfMonth } } }),
            this.prisma.chapter.count({ where: { publishedAt: { gte: startOfMonth } } }),
            this.prisma.manga.findMany({
                orderBy: { views: "desc" },
                take: 5,
                select: { slug: true, title: true, views: true },
            }),
        ]);

        return {
            totalManga,
            totalChapters,
            totalViews: viewsResult._sum.views ?? 0,
            newMangaThisMonth,
            newChaptersThisMonth,
            topManga,
        };
    }
}
