import { forwardRef, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { User, UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { BotAdminModule } from 'src/bot-admin/bot-admin.module';

@Module({
  imports: [
    forwardRef(() => BotAdminModule),
    HttpModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
