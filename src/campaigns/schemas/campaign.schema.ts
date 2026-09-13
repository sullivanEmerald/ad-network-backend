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
        required: false,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2,
    })
    code?: string;

    @Prop({
        required: false,
        trim: true,
        maxlength: 150,
    })
    label?: string;
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
        ref: 'User'
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
        required: false,
        enum: Object.values(CampaignObjective),
    })
    objective?: CampaignObjective;

    @Prop({
        type: [GeoTargetSchema],
        required: false,
    })
    geo?: GeoTarget[];

    @Prop({
        type: [String],
        enum: Object.values(CampaignDevice),
        required: false,
    })
    devices?: CampaignDevice[];

    @Prop({
        required: false,
        enum: Object.values(CampaignBudgetType),
    })
    budgetType?: CampaignBudgetType;

    @Prop({
        required: false,
        min: 0,
    })
    budgetAmount?: number;

    @Prop({
        required: false,
    })
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({ type: String, required: false, default: null })
    draftId?: string | null;

    @Prop({
        required: false,
        enum: Object.values(CampaignPacing),
    })
    pacing?: CampaignPacing;

    @Prop({
        required: true,
        enum: Object.values(CampaignStatus),
        default: CampaignStatus.DRAFT,
    })
    status?: CampaignStatus;

    @Prop({
        required: false,
        unique: true,
        index: true,
        sparse: true,
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