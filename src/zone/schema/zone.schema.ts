import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ZoneDocument = HydratedDocument<Zone>;

export enum ZoneStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

export enum LinkingMode {
    automatic = 'automatic',
    manual = 'manual',
}

@Schema({
    timestamps: true,
    collection: 'zones',
})
export class Zone {

    @Prop({
        type: Types.ObjectId,
        ref: 'Publisher',
        required: true,
        index: true,
    })
    publisherId!: Types.ObjectId;

    /**
     * Human-readable name shown in the Custex dashboard.
     */
    @Prop({
        required: true,
        trim: true,
        maxlength: 150,
    })
    name!: string;

    /**
     * Revive zone type.
     *
     * For the MVP this can be a banner zone.
     * We keep it as a string because Revive accepts the
     * `type` field directly.
     */
    @Prop({
        required: true,
        trim: true,
    })
    type!: string;


    @Prop({
        required: true,
        trim: true,
        enum: LinkingMode,
        default: LinkingMode.automatic,
    })
    linkingMode!: LinkingMode;

    /**
     * Width of the advertising placement in pixels.
     */
    @Prop({
        required: true,
        min: 1,
    })
    width!: number;

    /**
     * Height of the advertising placement in pixels.
     */
    @Prop({
        required: true,
        min: 1,
    })
    height!: number;


    @Prop({
        trim: true,
        maxlength: 500,
    })
    comments?: string;


    @Prop({
        type: Number,
        required: true,
        unique: true,
        index: true,
    })
    reviveZoneId!: number;


    @Prop({
        type: String,
        enum: ZoneStatus,
        default: ZoneStatus.ACTIVE,
        index: true,
    })
    status!: ZoneStatus;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);