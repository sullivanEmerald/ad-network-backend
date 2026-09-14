
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UploadedFile,
    UseInterceptors,
    UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreativeService } from './creative.service';
import { CreateCreativeDto } from './dto/create-creative.dto';
import * as creativeTypes from './types/creative.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CreativeController {
    constructor(
        private readonly creativeService: CreativeService,
    ) { }

    @Post(':campaignId/banners')
    @UseInterceptors(
        FileInterceptor('image', {
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    async createCreative(
        @Param('campaignId') campaignId: string,
        @Body() dto: CreateCreativeDto,
        @UploadedFile() file: creativeTypes.UploadedImageFile,
    ) {
        return this.creativeService.create(
            campaignId,
            dto,
            file,
        );
    }

    @Get(":campaignId/banners")
    async getBanners(@Param("campaignId") campaignId: string,) {
        const banners = await this.creativeService.getBanners(
            campaignId,
        )

        console.log(banners)
        return banners;
    }
}
