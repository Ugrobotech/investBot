import { forwardRef, Module } from '@nestjs/common';
import { BotAdminService } from './bot-admin.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    HttpModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [BotAdminService],
  exports: [BotAdminService],
})
export class BotAdminModule {}
