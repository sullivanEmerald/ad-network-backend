import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
    CampaignBudgetType,
    CampaignDevice,
    CampaignObjective,
    CampaignPacing,
} from '../dto/campaign.dto';

export type CampaignDocument = HydratedDocument<Campaign>;

export enum CampaignStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
}

@Schema({ _id: false })
export class GeoTarget {
    @Prop({
        required: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2,
    })
    code!: string;

    @Prop({
        required: true,
        trim: true,
        maxlength: 150,
    })
    label!: string;
}

export const GeoTargetSchema = SchemaFactory.createForClass(GeoTarget);

@Schema({
    timestamps: true,
})
export class Campaign {
    @Prop({
        type: Types.ObjectId,
        required: true,
        index: true,
    })
    organizationId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Advertiser',
        required: true,
        index: true,
    })
    advertiserId?: Types.ObjectId;

    @Prop({
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 80,
    })
    campaignName!: string;

    @Prop({
        required: true,
        enum: Object.values(CampaignObjective),
    })
    objective?: CampaignObjective;

    @Prop({
        type: [GeoTargetSchema],
        required: true,
    })
    geo!: GeoTarget[];

    @Prop({
        type: [String],
        enum: Object.values(CampaignDevice),
        required: true,
    })
    devices!: CampaignDevice[];

    @Prop({
        required: true,
        enum: Object.values(CampaignBudgetType),
    })
    budgetType!: CampaignBudgetType;

    @Prop({
        required: true,
        min: 50,
    })
    budgetAmount!: number;

    @Prop({
        required: true,
    })
    startDate!: Date;

    @Prop()
    endDate?: Date;

    @Prop({ type: String, required: false, default: null })
    draftId?: string | null;

    @Prop({
        required: true,
        enum: Object.values(CampaignPacing),
    })
    pacing!: CampaignPacing;

    @Prop({
        required: true,
        enum: Object.values(CampaignStatus),
        default: CampaignStatus.DRAFT,
    })
    status!: CampaignStatus;

    @Prop({
        required: true,
        unique: true,
        index: true,
    })
    reviveCampaignId?: number;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

CampaignSchema.index({
    organizationId: 1,
    advertiserId: 1,
});

CampaignSchema.index({
    organizationId: 1,
    campaignName: 1,
});