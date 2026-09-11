import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

@Schema({ timestamps: true, collection: 'campaigns' })
export class Campaign {
    @Prop({ required: true, index: true, ref: 'User' })
    userId!: string;

    @Prop({ required: true, enum: ['draft', 'active'], default: 'draft' })
    status!: 'draft' | 'active';

    @Prop({ required: false, default: 0 })
    currentStep?: number;

    @Prop({ type: [Number], default: [] })
    completedSteps?: number[];

    @Prop({ type: Object, default: {} })
    data!: Record<string, unknown>;

    @Prop({ type: Date, default: null })
    lastSavedAt!: Date | null;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);