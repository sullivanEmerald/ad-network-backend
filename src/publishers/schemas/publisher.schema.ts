import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { UserDocument } from '../../users/schemas/user.schema';

export type PublisherDocument = HydratedDocument<Publisher>;

export enum PublisherStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
}

export type PublisherUserDocument = UserDocument & {
    revivePublisherId?: number;
};

@Schema()
export class Publisher extends User {
    /**
     * Publisher name displayed in Custex.
     */
    @Prop({
        required: true,
        trim: true,
    })
    publisherName!: string;

    /**
     * Publisher's website.
     */
    @Prop({
        required: true,
        trim: true,
    })
    website!: string;

    /**
     * Contact person.
     */
    @Prop({
        required: true,
        trim: true,
    })
    contactName!: string;

    /**
     * Publisher contact email.
     */
    @Prop({
        required: true,
        trim: true,
        lowercase: true,
    })
    emailAddress!: string;

    /**
     * Publisher ID returned by Revive's
     * ox.addPublisher method.
     */
    @Prop({
        type: Number,
        required: true,
        unique: true,
        index: true,
    })
    revivePublisherId!: number;

    @Prop({
        type: String,
        enum: PublisherStatus,
        default: PublisherStatus.ACTIVE,
        index: true,
    })
    status!: PublisherStatus;

    @Prop({
        trim: true,
    })
    comments?: string;
}

export const PublisherSchema = SchemaFactory.createForClass(Publisher);
