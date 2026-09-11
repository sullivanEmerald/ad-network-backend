import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCampaignDto {
    @IsString()
    @IsOptional()
    status?: 'draft' | 'active';

    @IsOptional()
    @IsObject()
    data?: Record<string, unknown>;
}