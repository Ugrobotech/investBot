import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = mongoose.HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ unique: true })
  chatId: number;

  @Prop()
  userName: string;

  @Prop()
  referralCode: string;

  @Prop()
  refereeCode: string;

  @Prop()
  privateKeyMain: string;

  @Prop()
  privateKey: string;

  @Prop()
  mnemonicMain: string;

  @Prop()
  mnemonic: string;

  @Prop()
  walletAddressMain: string;

  @Prop()
  walletAddress: string;

  @Prop()
  amountsInvested: string[];

  @Prop()
  paymentHashes: string[];

  @Prop()
  earnings: string;

  @Prop()
  referralBonus: string;

  @Prop({ default: false })
  approved: boolean;

  @Prop({ default: false })
  rejected: boolean;

  @Prop({ default: false })
  hasNode: boolean;

  @Prop()
  nodeCode: string;

  @Prop({ default: 0.2 })
  nodeROIpercent: number;

  @Prop({ default: 0.5 })
  nodeDownLineROIpercent: number;

  @Prop()
  nodeProviderBonus: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
