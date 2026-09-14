import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublisherDocument = HydratedDocument<Publisher>;

export enum PublisherStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
}

@Schema({
    timestamps: true,
    collection: 'publishers',
})
export class Publisher {
    @Prop({
        type: Types.ObjectId,
        ref: 'Organisation',
        required: true,
        index: true,
    })
    organisationId!: Types.ObjectId;

    /**
     * Publisher name displayed in Custex.
     */
    @Prop({
        required: true,
        trim: true,
    })
    name!: string;

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
     * Revive agency this publisher belongs to.
     *
     * Revive calls organisations "agencies".
     */
    @Prop({
        type: Number,
        required: true,
        index: true,
    })
    reviveAgencyId!: number;

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
