import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAll(query: QueryUsersDto) {
        const { page = 1, limit = 20, role } = query;
        const skip = (page - 1) * limit;
        const where = role ? { role: role as Role } : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: { id: true, email: true, role: true, createdAt: true },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async create(dto: CreateUserDto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) {
            throw new ConflictException({ error: "Email already in use", code: "CONFLICT" });
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: { email: dto.email, passwordHash, role: dto.role as Role },
            select: { id: true, email: true, role: true, createdAt: true },
        });

        return user;
    }

    async update(userId: string, dto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException({ error: "User not found", code: "NOT_FOUND" });

        const updateData: any = {};
        if (dto.role) updateData.role = dto.role as Role;
        if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 12);

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, email: true, role: true, createdAt: true },
        });

        return updated;
    }

    async remove(userId: string, requestingUserId: string) {
        if (userId === requestingUserId) {
            throw new ForbiddenException({
                error: "Cannot delete your own account",
                code: "FORBIDDEN",
            });
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException({ error: "User not found", code: "NOT_FOUND" });

        await this.prisma.user.delete({ where: { id: userId } });
    }
}
