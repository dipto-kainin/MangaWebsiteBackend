import { Module } from "@nestjs/common";
import { ChaptersController } from "./chapters.controller";
import { AdminChaptersController } from "./admin-chapters.controller";
import { ChaptersService } from "./chapters.service";

@Module({
    controllers: [ChaptersController, AdminChaptersController],
    providers: [ChaptersService],
})
export class ChaptersModule {}
