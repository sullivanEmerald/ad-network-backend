import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

export enum CampaignObjective {
    TRAFFIC = 'traffic',
    AWARENESS = 'awareness',
    CONVERSIONS = 'conversions',
    APP_INSTALLATION = 'app_installation',
    ENGAGEMENT = 'engagement',
}

export enum CampaignBudgetType {
    DAILY = 'daily',
    LIFETIME = 'lifetime',
}

export enum CampaignPacing {
    STANDARD = 'standard',
    ACCELERATED = 'accelerated',
}

export enum CampaignStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
}

export enum CampaignDevice {
    DESKTOP = 'desktop',
    MOBILE = 'mobile',
    TABLET = 'tablet',
    CTV = 'ctv',
}

export class GeoTargetDto {
    @IsString()
    @Length(2, 2)
    code!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(150)
    label!: string;
}

export class LaunchCampaignDto {
    @IsEnum(CampaignStatus)
    status!: CampaignStatus;

    @IsString()
    @MinLength(3)
    campaignName!: string;

    @IsEnum(CampaignObjective)
    objective!: CampaignObjective;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => GeoTargetDto)
    geo!: GeoTargetDto[];

    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(CampaignDevice, { each: true })
    devices!: CampaignDevice[];

    @IsEnum(CampaignBudgetType)
    budgetType!: CampaignBudgetType;

    @IsNumber()
    @Min(50)
    budgetAmount!: number;

    @IsDateString()
    startDate!: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    draftId?: string

    @IsEnum(CampaignPacing)
    pacing?: CampaignPacing;
}