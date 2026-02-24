import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { StatsService } from "./stats.service";

@Controller("admin/stats")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MODERATOR")
export class StatsController {
    constructor(private statsService: StatsService) {}

    // GET /api/v1/admin/stats
    @Get()
    getDashboard() {
        return this.statsService.getDashboardStats();
    }
}
