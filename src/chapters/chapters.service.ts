import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CreateChapterDto } from "./dto/create-chapter.dto";
import { UpdateChapterDto } from "./dto/update-chapter.dto";

@Injectable()
export class ChaptersService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) {}

    // ─── Public ───────────────────────────────────────────────────────────────

    async findById(chapterId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                pages: { orderBy: { number: "asc" } },
                manga: { select: { id: true } },
            },
        });

        if (!chapter) {
            throw new NotFoundException({ error: "Chapter not found", code: "NOT_FOUND" });
        }

        // Fetch prev/next chapters within same manga
        const [prev, next] = await Promise.all([
            this.prisma.chapter.findFirst({
                where: { mangaId: chapter.mangaId, number: { lt: chapter.number } },
                orderBy: { number: "desc" },
                select: { id: true, number: true },
            }),
            this.prisma.chapter.findFirst({
                where: { mangaId: chapter.mangaId, number: { gt: chapter.number } },
                orderBy: { number: "asc" },
                select: { id: true, number: true },
            }),
        ]);

        return {
            id: chapter.id,
            mangaId: chapter.mangaId,
            number: chapter.number,
            title: chapter.title,
            publishedAt: chapter.publishedAt,
            views: chapter.views,
            pages: chapter.pages.map((p) => ({ number: p.number, imageUrl: p.imageUrl })),
            prev: prev ?? null,
            next: next ?? null,
        };
    }

    async incrementView(chapterId: string) {
        await this.prisma.chapter.updateMany({
            where: { id: chapterId },
            data: { views: { increment: 1 } },
        });
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    async create(slug: string, dto: CreateChapterDto, pageFiles: Express.Multer.File[]) {
        const manga = await this.prisma.manga.findUnique({ where: { slug } });
        if (!manga) throw new NotFoundException({ error: "Manga not found", code: "NOT_FOUND" });

        const existing = await this.prisma.chapter.findUnique({
            where: { mangaId_number: { mangaId: manga.id, number: dto.number } },
        });
        if (existing) {
            throw new ConflictException({
                error: `Chapter ${dto.number} already exists`,
                code: "CONFLICT",
            });
        }

        // Upload pages in order (width 1024px via CloudinaryService)
        const uploadedPages = await Promise.all(
            pageFiles.map((file, idx) =>
                this.cloudinary
                    .uploadImage(file.buffer, `ironvine/chapters/${manga.slug}/ch-${dto.number}`)
                    .then((result) => ({ number: idx + 1, imageUrl: result.url })),
            ),
        );

        const chapter = await this.prisma.chapter.create({
            data: {
                mangaId: manga.id,
                number: dto.number,
                title: dto.title,
                pages: {
                    create: uploadedPages,
                },
            },
        });

        return { id: chapter.id, number: chapter.number, pageCount: uploadedPages.length };
    }

    async update(chapterId: string, dto: UpdateChapterDto, pageFiles?: Express.Multer.File[]) {
        const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
        if (!chapter)
            throw new NotFoundException({ error: "Chapter not found", code: "NOT_FOUND" });

        const updateData: any = {};
        if (dto.title) updateData.title = dto.title;
        if (dto.number) updateData.number = dto.number;

        if (pageFiles && pageFiles.length > 0) {
            // Replace all pages
            await this.prisma.page.deleteMany({ where: { chapterId } });

            const manga = await this.prisma.manga.findUnique({ where: { id: chapter.mangaId } });
            const uploadedPages = await Promise.all(
                pageFiles.map((file, idx) =>
                    this.cloudinary
                        .uploadImage(
                            file.buffer,
                            `ironvine/chapters/${manga.slug}/ch-${chapter.number}`,
                        )
                        .then((result) => ({ number: idx + 1, imageUrl: result.url })),
                ),
            );
            updateData.pages = { create: uploadedPages };
        }

        const updated = await this.prisma.chapter.update({
            where: { id: chapterId },
            data: updateData,
            include: { pages: { orderBy: { number: "asc" } } },
        });

        return updated;
    }

    async remove(chapterId: string) {
        const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
        if (!chapter)
            throw new NotFoundException({ error: "Chapter not found", code: "NOT_FOUND" });
        await this.prisma.chapter.delete({ where: { id: chapterId } });
    }
}
