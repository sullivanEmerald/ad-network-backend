import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LaunchCampaignDto } from './campaign.dto';

export class CreateDraftCampaignDto extends LaunchCampaignDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    currentStep?: number;

    @IsOptional()
    @IsInt({ each: true })
    @Min(0, { each: true })
    completedSteps?: number[];

}