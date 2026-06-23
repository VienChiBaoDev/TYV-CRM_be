import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UsersService } from '../../src/users/users.service';
import { PerformanceService } from '../../src/performance/performance.service';
import { buildPrismaStub, type PrismaStub } from './prisma-mock.helper';
import { buildUsersServiceStub } from './users-service-mock.helper';

export interface AppTestContext {
  app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any;
  prisma: PrismaStub;
  close: () => Promise<void>;
}

const NOOP_PERFORMANCE_SERVICE = {
  listAssignments: async () => [],
  listAssignmentsMultiTeam: async () => [],
  batchCreateAssignments: async () => ({ created: 1 }),
  patchAssignment: async () => ({}),
  patchAssignmentSelf: async () => ({}),
  deleteAssignment: async () => ({}),
  getTeamSummaries: async () => [],
  cascadeAddAssignment: async () => ({ created: 1 }),
  cascadeUpdateByContent: async () => ({ updated: 1 }),
  cascadeDeleteByContent: async () => ({ deleted: 1 }),
  autoSeedTeam: async () => ({ seeded: 0, dryRun: false }),
  getTeamMetricTemplates: async () => [],
  upsertWindowConfig: async () => ({}),
  getUserSnapshot: async () => null,
  getHonorBoard: async () => [],
  getHonorBoardSales: async () => [],
  getHonorBoardTraffic: async () => [],
  getCatalogDivisionAllowlist: async () => [],
};

export async function createTestApp(): Promise<AppTestContext> {
  const prisma = buildPrismaStub();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(UsersService)
    .useValue(buildUsersServiceStub())
    .overrideProvider(PerformanceService)
    .useValue(NOOP_PERFORMANCE_SERVICE)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use(cookieParser());
  await app.init();

  return {
    app,
    server: app.getHttpServer(),
    prisma,
    close: () => app.close(),
  };
}
