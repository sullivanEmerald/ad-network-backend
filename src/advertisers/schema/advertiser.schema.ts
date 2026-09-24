import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AdvertiserStatus } from '../enums/adveriser-status.enum';
import { User } from '../../users/schemas/user.schema';
import { UserDocument } from '../../users/schemas/user.schema';

export type AdvertiserDocument = HydratedDocument<Advertiser>;

export type AdvertiserUserDocument = UserDocument & {
    reviveAdvertiserId?: number | null;
};

@Schema()
export class Advertiser extends User {
    @Prop({
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 150,
    })
    advertiserName!: string;

    @Prop({
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 150,
    })
    advertiserEmail!: string;

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
