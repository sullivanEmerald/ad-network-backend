import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for publishing a campaign to Revive AdServer
 */

export class PublishBannerDto {
  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsUrl()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  bannerName?: string;

  @IsEnum(['html', 'image', 'swf', 'flash'])
  @IsOptional()
  bannerType?: string;
}

export class PublishCampaignToReviveDto {
  @IsString()
  campaignName!: string;

  @IsDateString()
  startDate!: string; // ISO date: "YYYY-MM-DD"

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber()
  @Min(0)
  budgetAmount!: number;

  @IsEnum(['impression', 'click', 'conversion'])
  budgetType!: 'impression' | 'click' | 'conversion';

  @IsUrl()
  clickThroughUrl!: string;

  @IsOptional()
  @IsString()
  pacing?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishBannerDto)
  @ArrayMinSize(1)
  banners!: PublishBannerDto[];

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  zoneIds!: number[];
}
