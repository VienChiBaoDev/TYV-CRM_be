import type { Prisma as GeneratedPrisma } from '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    facebookCskhConfig: GeneratedPrisma.FacebookCskhConfigDelegate;
    facebookOAuthSession: GeneratedPrisma.FacebookOAuthSessionDelegate;
    cskhJobRun: GeneratedPrisma.CskhJobRunDelegate;
    cskhMonitorItem: GeneratedPrisma.CskhMonitorItemDelegate;
    cskhInboxConversation: GeneratedPrisma.CskhInboxConversationDelegate;
    cskhInboxMessage: GeneratedPrisma.CskhInboxMessageDelegate;
  }
}
