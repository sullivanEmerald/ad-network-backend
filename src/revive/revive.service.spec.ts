import { Test, TestingModule } from '@nestjs/testing';
import { ReviveService } from './revive.service';

describe('ReviveService', () => {
  let service: ReviveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviveService],
    }).compile();

    service = module.get<ReviveService>(ReviveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
