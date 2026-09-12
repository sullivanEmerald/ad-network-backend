import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type UserRole = "owner" | "member";
export type AccountType = "advertiser" | "publisher";

const AccountTypeEnum = ["advertiser", "publisher"] as const;

@Schema({ timestamps: true, collection: "users" })
export class User extends Document {
    @Prop({ required: true, trim: true })
    firstName!: string;

    @Prop({ required: true, trim: true })
    lastName!: string;

    @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
    businessEmail!: string;

    @Prop({ required: true, trim: true })
    organizationName!: string;

    @Prop({ required: true, enum: AccountTypeEnum, default: "advertiser" })
    accountType!: AccountType;

    @Prop({ required: true })
    password!: string;

    @Prop({ type: Types.ObjectId, ref: "Account", required: true, index: true })
    accountId!: Types.ObjectId;

    @Prop({ required: true, enum: ["owner", "member"], default: "owner" })
    role!: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
