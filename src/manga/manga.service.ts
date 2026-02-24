import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { MangaStatus, Prisma } from "@prisma/client";
import slugify from "slugify";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { QueryMangaDto } from "./dto/query-manga.dto";
import { CreateMangaDto } from "./dto/create-manga.dto";
import { UpdateMangaDto } from "./dto/update-manga.dto";

@Injectable()
export class MangaService {
    constructor(
        private prisma: PrismaService,
        private cloudinary: CloudinaryService,
    ) {}

    // ─── Public ───────────────────────────────────────────────────────────────

    async findAll(query: QueryMangaDto) {
        const { page = 1, limit = 20, sort = "latest", genre, status, q } = query;
        const safeLimit = Math.min(limit, 100);
        const skip = (page - 1) * safeLimit;

        const where: Prisma.MangaWhereInput = {};

        if (status) {
            where.status = status.toUpperCase() as MangaStatus;
        }

        if (genre) {
            where.genres = { some: { genre: { name: { equals: genre, mode: "insensitive" } } } };
        }

        if (q) {
            where.OR = [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
            ];
        }

        let orderBy: Prisma.MangaOrderByWithRelationInput;
        if (sort === "rating") orderBy = { rating: "desc" };
        else if (sort === "trending") orderBy = { views: "desc" };
        else orderBy = { createdAt: "desc" };

        const [data, total] = await Promise.all([
            this.prisma.manga.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy,
                include: {
                    genres: { include: { genre: true } },
                    tags: { include: { tag: true } },
                    chapters: { select: { number: true }, orderBy: { number: "desc" } },
                },
            }),
            this.prisma.manga.count({ where }),
        ]);

        return {
            data: data.map(this.formatManga),
            pagination: {
                page,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
            },
        };
    }

    async findBySlug(slug: string) {
        const manga = await this.prisma.manga.findUnique({
            where: { slug },
            include: {
                genres: { include: { genre: true } },
                tags: { include: { tag: true } },
                chapters: {
                    orderBy: { number: "asc" },
                    include: { pages: { select: { id: true } } },
                },
            },
        });
        if (!manga) throw new NotFoundException({ error: "Manga not found", code: "NOT_FOUND" });

        return {
            ...this.formatManga(manga),
            chapters: manga.chapters.map((c) => ({
                id: c.id,
                number: c.number,
                title: c.title,
                publishedAt: c.publishedAt,
                views: c.views,
                pageCount: c.pages.length,
            })),
        };
    }

    async incrementView(slug: string) {
        await this.prisma.manga.updateMany({
            where: { slug },
            data: { views: { increment: 1 } },
        });
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    async create(dto: CreateMangaDto, coverBuffer: Buffer) {
        const slug = await this.generateSlug(dto.title);
        const { url: coverImage } = await this.cloudinary.uploadImage(
            coverBuffer,
            "ironvine/covers",
        );

        const genres = this.parseArray(dto.genres);
        const tags = this.parseArray(dto.tags);

        const manga = await this.prisma.manga.create({
            data: {
                slug,
                title: dto.title,
                description: dto.description,
                author: dto.author,
                artist: dto.artist,
                publishedYear: dto.publishedYear,
                status: dto.status.toUpperCase() as MangaStatus,
                coverImage,
                genres: {
                    create: await Promise.all(
                        genres.map(async (name) => ({
                            genre: {
                                connectOrCreate: {
                                    where: { name },
                                    create: { name },
                                },
                            },
                        })),
                    ),
                },
                tags: {
                    create: await Promise.all(
                        tags.map(async (name) => ({
                            tag: {
                                connectOrCreate: {
                                    where: { name },
                                    create: { name },
                                },
                            },
                        })),
                    ),
                },
            },
        });

        return { id: manga.id, slug: manga.slug };
    }

    async update(slug: string, dto: UpdateMangaDto, coverBuffer?: Buffer) {
        const existing = await this.prisma.manga.findUnique({ where: { slug } });
        if (!existing) throw new NotFoundException({ error: "Manga not found", code: "NOT_FOUND" });

        const updateData: Prisma.MangaUpdateInput = {};

        if (dto.title) updateData.title = dto.title;
        if (dto.description) updateData.description = dto.description;
        if (dto.author) updateData.author = dto.author;
        if (dto.artist) updateData.artist = dto.artist;
        if (dto.publishedYear) updateData.publishedYear = dto.publishedYear;
        if (dto.status) updateData.status = dto.status.toUpperCase() as MangaStatus;

        if (coverBuffer) {
            const { url } = await this.cloudinary.uploadImage(coverBuffer, "ironvine/covers");
            updateData.coverImage = url;
        }

        if (dto.genres !== undefined) {
            const genres = this.parseArray(dto.genres);
            await this.prisma.mangaGenre.deleteMany({ where: { mangaId: existing.id } });
            updateData.genres = {
                create: genres.map((name) => ({
                    genre: { connectOrCreate: { where: { name }, create: { name } } },
                })),
            };
        }

        if (dto.tags !== undefined) {
            const tags = this.parseArray(dto.tags);
            await this.prisma.mangaTag.deleteMany({ where: { mangaId: existing.id } });
            updateData.tags = {
                create: tags.map((name) => ({
                    tag: { connectOrCreate: { where: { name }, create: { name } } },
                })),
            };
        }

        const updated = await this.prisma.manga.update({
            where: { slug },
            data: updateData,
            include: {
                genres: { include: { genre: true } },
                tags: { include: { tag: true } },
            },
        });

        return this.formatManga(updated);
    }

    async remove(slug: string) {
        const existing = await this.prisma.manga.findUnique({ where: { slug } });
        if (!existing) throw new NotFoundException({ error: "Manga not found", code: "NOT_FOUND" });
        await this.prisma.manga.delete({ where: { slug } });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private formatManga(manga: any) {
        const chapters: any[] = manga.chapters ?? [];
        const latestChapter =
            chapters.length > 0 ? Math.max(...chapters.map((c: any) => c.number)) : null;

        return {
            id: manga.id,
            slug: manga.slug,
            title: manga.title,
            description: manga.description,
            coverImage: manga.coverImage,
            status: manga.status,
            rating: manga.rating,
            views: manga.views,
            author: manga.author,
            artist: manga.artist,
            publishedYear: manga.publishedYear,
            chapterCount: chapters.length,
            latestChapter,
            genres: manga.genres?.map((g: any) => g.genre?.name).filter(Boolean) ?? [],
            tags: manga.tags?.map((t: any) => t.tag?.name).filter(Boolean) ?? [],
        };
    }

    private parseArray(value?: string | string[]): string[] {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
        } catch {
            return [value];
        }
    }

    private async generateSlug(title: string): Promise<string> {
        let slug = slugify(title, { lower: true, strict: true });
        let exists = await this.prisma.manga.findUnique({ where: { slug } });
        let suffix = 1;
        while (exists) {
            slug = `${slugify(title, { lower: true, strict: true })}-${suffix++}`;
            exists = await this.prisma.manga.findUnique({ where: { slug } });
        }
        return slug;
    }
}
