import { randomUUID } from 'node:crypto';

type AnyRecord = Record<string, unknown>;

function makeInMemoryCrud<T extends AnyRecord>(idField = 'id') {
  const store = new Map<string, T>();

  return {
    store,
    findMany: async (args?: { orderBy?: unknown; where?: Partial<T> }) => {
      let rows = [...store.values()];
      if (args?.where) {
        rows = rows.filter((r) =>
          Object.entries(args.where!).every(([k, v]) => r[k] === v),
        );
      }
      return rows;
    },
    findUnique: async (args: { where: Partial<T> }) => {
      for (const [, row] of store) {
        const matches = Object.entries(args.where).every(([k, v]) => row[k] === v);
        if (matches) return row;
      }
      return null;
    },
    findFirst: async (args?: { where?: Partial<T> }) => {
      if (!args?.where) return store.size > 0 ? [...store.values()][0] : null;
      for (const row of store.values()) {
        const matches = Object.entries(args.where).every(([k, v]) => row[k] === v);
        if (matches) return row;
      }
      return null;
    },
    create: async (args: { data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const id = randomUUID();
      const row = {
        [idField]: id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      } as unknown as T;
      store.set(id, row);
      return row;
    },
    update: async (args: { where: Partial<T>; data: Partial<T> }) => {
      for (const [key, row] of store) {
        const matches = Object.entries(args.where).every(([k, v]) => row[k] === v);
        if (matches) {
          const updated = { ...row, ...args.data, updatedAt: new Date() };
          store.set(key, updated as T);
          return updated;
        }
      }
      throw new Error('Record not found');
    },
    delete: async (args: { where: Partial<T> }) => {
      for (const [key, row] of store) {
        const matches = Object.entries(args.where).every(([k, v]) => row[k] === v);
        if (matches) {
          store.delete(key);
          return row;
        }
      }
      throw new Error('Record not found');
    },
    count: async (args?: { where?: Partial<T> }) => {
      if (!args?.where) return store.size;
      return [...store.values()].filter((r) =>
        Object.entries(args.where!).every(([k, v]) => r[k] === v),
      ).length;
    },
    upsert: async (args: { where: Partial<T>; create: AnyRecord; update: AnyRecord }) => {
      for (const [key, row] of store) {
        const matches = Object.entries(args.where).every(([k, v]) => row[k] === v);
        if (matches) {
          const updated = { ...row, ...args.update, updatedAt: new Date() };
          store.set(key, updated as T);
          return updated;
        }
      }
      const id = randomUUID();
      const row = { [idField]: id, createdAt: new Date(), updatedAt: new Date(), ...args.create } as unknown as T;
      store.set(id, row);
      return row;
    },
  };
}

export type PrismaStub = ReturnType<typeof buildPrismaStub>;

export function buildPrismaStub() {
  const division = makeInMemoryCrud();
  const teamGroup = makeInMemoryCrud();
  const permissionAssignment = makeInMemoryCrud();
  const roleEmailOverride = makeInMemoryCrud();

  const kpiTrafficTeamAllowlist = makeInMemoryCrud();

  const stub = {
    division,
    teamGroup,
    kpiTrafficTeamAllowlist: {
      ...kpiTrafficTeamAllowlist,
      findMany: async (_args?: unknown) => [...kpiTrafficTeamAllowlist.store.values()],
      findUnique: async (args: { where: { teamId?: string; [key: string]: unknown } }) => {
        if (args.where.teamId) {
          for (const row of kpiTrafficTeamAllowlist.store.values()) {
            if (row['teamId'] === args.where.teamId) return row;
          }
          return null;
        }
        return null;
      },
      upsert: async (args: { where: { teamId: string }; create: AnyRecord; update: AnyRecord }) => {
        for (const [key, row] of kpiTrafficTeamAllowlist.store) {
          if (row['teamId'] === args.where.teamId) {
            const updated = { ...row, ...args.update };
            kpiTrafficTeamAllowlist.store.set(key, updated);
            return updated;
          }
        }
        const id = randomUUID();
        const row = { id, ...args.create };
        kpiTrafficTeamAllowlist.store.set(id, row);
        return row;
      },
      deleteMany: async (args: { where: { teamId: string } }) => {
        let count = 0;
        for (const [key, row] of kpiTrafficTeamAllowlist.store) {
          if (row['teamId'] === args.where.teamId) {
            kpiTrafficTeamAllowlist.store.delete(key);
            count++;
          }
        }
        return { count };
      },
    },
    permissionAssignment: {
      ...permissionAssignment,
      findUnique: async (args: { where: { userId_scopeKey?: { userId: string; scopeKey: string }; [key: string]: unknown } }) => {
        if (args.where.userId_scopeKey) {
          const { userId, scopeKey } = args.where.userId_scopeKey;
          for (const row of permissionAssignment.store.values()) {
            if (row['userId'] === userId && row['scopeKey'] === scopeKey) return row;
          }
          return null;
        }
        return permissionAssignment.findUnique(args as Parameters<typeof permissionAssignment.findUnique>[0]);
      },
      upsert: async (args: {
        where: { userId_scopeKey: { userId: string; scopeKey: string } };
        create: AnyRecord;
        update: AnyRecord;
      }) => {
        const { userId, scopeKey } = args.where.userId_scopeKey;
        for (const [key, row] of permissionAssignment.store) {
          if (row['userId'] === userId && row['scopeKey'] === scopeKey) {
            const updated = { ...row, ...args.update, updatedAt: new Date() };
            permissionAssignment.store.set(key, updated);
            return updated;
          }
        }
        const id = randomUUID();
        const row = { id, createdAt: new Date(), updatedAt: new Date(), ...args.create };
        permissionAssignment.store.set(id, row);
        return row;
      },
    },
    roleEmailOverride,
    learningClass: {
      count: async (_args?: unknown) => 0,
    },
    staffGeneral: { findUnique: async () => null },
    staffProficient: { findUnique: async () => null },
    staffProbation: { findUnique: async () => null },
    department: makeInMemoryCrud(),
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(stub),
    $connect: async () => undefined,
    $disconnect: async () => undefined,
  };

  return stub;
}
