import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class UsersController {
    constructor(private usersService: UsersService) {}

    // GET /api/v1/admin/users
    @Get()
    findAll(@Query() query: QueryUsersDto) {
        return this.usersService.findAll(query);
    }

    // POST /api/v1/admin/users
    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    // PATCH /api/v1/admin/users/:userId
    @Patch(":userId")
    update(@Param("userId") userId: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(userId, dto);
    }

    // DELETE /api/v1/admin/users/:userId
    @Delete(":userId")
    @HttpCode(204)
    async remove(@Param("userId") userId: string, @CurrentUser("userId") requestingUserId: string) {
        await this.usersService.remove(userId, requestingUserId);
    }
}
