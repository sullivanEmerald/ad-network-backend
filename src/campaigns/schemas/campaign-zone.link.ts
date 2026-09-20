// campaign-zone-link.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LinkStatus {
    ACTIVE = 'active',
    UNLINKED = 'unlinked',
}

export enum LinkInitiator {
    SYSTEM = 'system',
    PUBLISHER = 'publisher',
    ADVERTISER = 'advertiser',
}

@Schema({ timestamps: true })
export class CampaignZoneLink extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
    campaignId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Zone', required: true })
    zoneId!: Types.ObjectId;

    @Prop({ required: true })
    reviveCampaignId!: number;

    @Prop({ required: true })
    reviveZoneId!: number;

    @Prop({ enum: LinkStatus, default: LinkStatus.ACTIVE })
    status!: LinkStatus;

    @Prop({ enum: LinkInitiator, default: LinkInitiator.SYSTEM })
    initiatedBy!: LinkInitiator;
}

export const CampaignZoneLinkSchema = SchemaFactory.createForClass(CampaignZoneLink);
CampaignZoneLinkSchema.index({ campaignId: 1, zoneId: 1 }, { unique: true });