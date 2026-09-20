import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

export enum CampaignStatus {
    CREATED = 'draft',
    PENDING = 'pending',
    COMPLETED = "completed",
    LINKED = "linked"
}

@Schema()
export class Campaign {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    })
    organizationId!: Types.ObjectId;

    @Prop({
        type: Number,
        required: true,
        index: true,
    })
    advertiserId!: number;

    @Prop({
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 80,
    })
    campaignName!: string;

    @Prop({
        required: true,
    })
    startDate!: Date;

    @Prop({
        required: false,
    })
    endDate?: Date;

    @Prop({
        type: String,
        enum: Object.values(CampaignStatus),
        required: true,
        default: CampaignStatus.CREATED
    })
    status!: CampaignStatus;
    @Prop({
        required: false,
        unique: true,
        index: true,
        sparse: true,
    })
    reviveCampaignId?: number;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
