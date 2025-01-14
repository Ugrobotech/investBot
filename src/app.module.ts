import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BotAdminModule } from './bot-admin/bot-admin.module';

@Module({
  imports: [
    BotModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    BotAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
