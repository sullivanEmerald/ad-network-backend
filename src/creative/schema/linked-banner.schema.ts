import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LinkedBannerDocument = HydratedDocument<LinkedBanner>;

export enum LinkedBannerStatus {
    ACTIVE = 'ACTIVE',
    UNLINKED = 'UNLINKED',
}

@Schema({
    timestamps: true,
    collection: 'linked_banners',
})
export class LinkedBanner {
    @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true, index: true })
    campaignId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Creative', required: true, index: true })
    creativeId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Zone', required: true, index: true })
    zoneId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    publisherId!: Types.ObjectId;

    @Prop({ type: Number, required: true })
    reviveCampaignId!: number;

    @Prop({ type: Number, required: true })
    reviveZoneId!: number;

    @Prop({ type: Number, required: true })
    reviveBannerId!: number;

    @Prop({
        type: String,
        enum: LinkedBannerStatus,
        default: LinkedBannerStatus.ACTIVE,
        index: true,
    })
    status!: LinkedBannerStatus;
}

export const LinkedBannerSchema = SchemaFactory.createForClass(LinkedBanner);
LinkedBannerSchema.index({ campaignId: 1, zoneId: 1 }, { unique: true });