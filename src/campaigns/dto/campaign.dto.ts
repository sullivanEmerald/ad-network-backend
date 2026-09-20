import {
    IsDateString,
    IsEnum,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';



export class LaunchCampaignDto {
    @IsString()
    @MinLength(3)
    campaignName!: string;

    @IsDateString()
    startDate!: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

}