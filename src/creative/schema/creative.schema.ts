
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CreativeDocument = HydratedDocument<Creative>;

export enum CreativeType {
    IMAGE = 'IMAGE',
    HTML = 'HTML',
    HTML5 = 'HTML5',
    VIDEO = 'VIDEO',
    NATIVE = 'NATIVE',
}

export enum CreativeStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
    FAILED = 'FAILED',
}

@Schema({
    timestamps: true,
    collection: 'creatives',
})
export class Creative {
    @Prop({
        type: Types.ObjectId,
        ref: 'Campaign',
        required: true,
        index: true,
    })
    campaignId!: Types.ObjectId;

    @Prop({
        type: Number,
        required: true,
        index: true,
    })
    reviveCampaignId!: number;

    @Prop({
        required: true,
        trim: true,
    })
    name!: string;

    @Prop({
        type: String,
        enum: CreativeType,
        required: true,
        default: CreativeType.IMAGE,
    })
    type!: CreativeType;


    @Prop({
        required: true,
        trim: true,
    })
    destinationUrl!: string;

    @Prop({
        trim: true,
    })
    fileName?: string;

    @Prop({
        trim: true,
    })
    mimeType?: string;

    @Prop()
    width?: number;

    @Prop()
    height?: number;


    @Prop({
        type: Number,
        required: true,
        index: true,
        unique: true,
    })
    reviveBannerId!: number;

    /**
     * Revive storage type.
     * For our MVP uploaded images use "web".
     */
    @Prop({
        default: 'web',
    })
    reviveStorageType!: string;

    @Prop({
        type: String,
        enum: CreativeStatus,
        default: CreativeStatus.ACTIVE,
        index: true,
    })
    status!: CreativeStatus;
}

export const CreativeSchema = SchemaFactory.createForClass(Creative);

