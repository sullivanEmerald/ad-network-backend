import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateDraftCampaignDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    currentStep?: number;

    @IsOptional()
    @IsInt({ each: true })
    @Min(0, { each: true })
    completedSteps?: number[];

    @IsString()
    status!: string;

    @IsOptional()
    @IsString()
    draftId?: string;

    @IsObject()
    data!: Record<string, unknown>;
}