import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import axios from 'axios';

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION?.trim() || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function bootstrap() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('Fetching all Facebook configurations...');
  const configs = await prisma.facebookCskhConfig.findMany();
  console.log(`Found ${configs.length} configurations.`);

  let succeeded = 0;
  let failed = 0;

  for (const config of configs) {
    if (!config.pageAccessToken) {
      console.log(`- Page: "${config.pageName}" (${config.pageId}) has no access token. Skipping.`);
      continue;
    }

    console.log(`- Subscribing Page: "${config.pageName}" (${config.pageId})...`);
    try {
      const url = `${GRAPH_BASE}/${config.pageId}/subscribed_apps`;
      const res = await axios.post(
        url,
        null,
        {
          params: {
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,messaging_referrals',
            access_token: config.pageAccessToken,
          },
          timeout: 10000,
        }
      );
      console.log(`  => Success: ${JSON.stringify(res.data)}`);
      succeeded++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error(`  => Failed: ${errMsg}`);
      if (axios.isAxiosError(e) && e.response) {
        console.error(`     FB Response: ${JSON.stringify(e.response.data)}`);
      }
      failed++;
    }
  }

  console.log(`Subscription check complete. Succeeded: ${succeeded}, Failed: ${failed}`);
  await app.close();
}

bootstrap().catch(console.error);
