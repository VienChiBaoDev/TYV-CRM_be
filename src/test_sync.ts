import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CskhInboxService } from './cskh/cskh-inbox.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const inboxService = app.get(CskhInboxService);
  const prisma = app.get(PrismaService);

  const pageId = '361934747012477'; // HuyK Viễn Chí Bảo
  console.log(`Checking config for Page ID: ${pageId}...`);
  const config = await prisma.facebookCskhConfig.findUnique({ where: { pageId } });
  if (!config) {
    console.error(`No config found for Page ID ${pageId}`);
    await app.close();
    return;
  }
  console.log(`Page: "${config.pageName}" | Enabled: ${config.enabled} | Token length: ${config.pageAccessToken?.length || 0}`);

  console.log('Starting syncFromGraph...');
  try {
    const result = await inboxService.syncFromGraph(pageId);
    console.log('Sync completed successfully!', result);

    // Query latest conversations and messages to verify if they updated
    const convs = await prisma.cskhInboxConversation.findMany({
      where: { pageId },
      orderBy: { lastMessageAt: 'desc' },
      take: 5,
    });
    console.log(`Conversations after sync: ${convs.length}`);
    for (const c of convs) {
      console.log(`- Customer: "${c.customerName}" | LastMsgAt: ${c.lastMessageAt} | LastMsg: "${c.lastMessage}"`);
    }
  } catch (error) {
    console.error('Error during sync:', error);
  }

  await app.close();
}

bootstrap().catch(console.error);
