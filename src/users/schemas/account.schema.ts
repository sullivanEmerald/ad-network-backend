import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, collection: "accounts" })
export class Account extends Document {
    @Prop({ required: true })
    accountName!: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
