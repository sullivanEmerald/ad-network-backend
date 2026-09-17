import {
    Body,
    Controller,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/jwt/jwt-payload.interface';

@UseGuards(JwtAuthGuard)
@Controller('banners')
export class ZoneController {

}
