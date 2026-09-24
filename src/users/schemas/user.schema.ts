import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type AccountType = "Advertiser" | "Publisher";

@Schema({
    timestamps: true,
    collection: "users",
    discriminatorKey: "accountType",
})
export class User {
    @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
    email!: string;

    accountType!: AccountType;

    @Prop({ required: true })
    password!: string;

    @Prop({
        type: Number,
        unique: true,
        sparse: true,
        index: true,
    })
    reviveAgencyId?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
