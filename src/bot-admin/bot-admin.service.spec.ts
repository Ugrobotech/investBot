import { Test, TestingModule } from '@nestjs/testing';
import { BotAdminService } from './bot-admin.service';

describe('BotAdminService', () => {
  let service: BotAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BotAdminService],
    }).compile();

    service = module.get<BotAdminService>(BotAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
