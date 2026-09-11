import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AdvertiserStatus } from '../enums/adveriser-status.enum';

export type AdvertiserDocument = HydratedDocument<Advertiser>;

@Schema({
    timestamps: true,
    collection: 'advertisers',
})
export class Advertiser {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    })
    organizationId!: Types.ObjectId;

    @Prop({
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 150,
    })
    name!: string;

    @Prop({
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 150,
    })
    email!: string;

    @Prop({
        type: String,
        enum: Object.values(AdvertiserStatus),
        default: AdvertiserStatus.PENDING,
        index: true,
    })
    status!: AdvertiserStatus;

    @Prop({
        type: Number,
        default: null,
        index: true,
    })
    reviveAdvertiserId?: number | null;
}

export const AdvertiserSchema = SchemaFactory.createForClass(Advertiser);

/**
 * One advertiser profile per organization.
 */
AdvertiserSchema.index(
    { organizationId: 1 },
    { unique: true },
);