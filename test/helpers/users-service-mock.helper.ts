import { IDENTITIES, type TestRole } from './jwt.helper';

export type MockUser = {
  id: string;
  email: string;
  role: TestRole;
  fullNameLegal: string;
  jobTitle: string | null;
  teamId: string | null;
  divisionId: string | null;
  departmentId: string | null;
  appProfile: null;
  [key: string]: unknown;
};

const MOCK_USERS: Record<string, MockUser> = {};
for (const [role, identity] of Object.entries(IDENTITIES) as [TestRole, (typeof IDENTITIES)[TestRole]][]) {
  MOCK_USERS[identity.sub] = {
    id: identity.sub,
    email: identity.email,
    role: role as TestRole,
    fullNameLegal: `Test ${role}`,
    jobTitle: null,
    teamId: null,
    divisionId: null,
    departmentId: null,
    appProfile: null,
  };
}

export function buildUsersServiceStub() {
  return {
    findById: async (id: string) => MOCK_USERS[id] ?? null,
    findByIdWithProfile: async (id: string) => MOCK_USERS[id] ?? null,
    resolveAppRole: async (_email: string, user: MockUser | null) =>
      (user?.role as string) ?? 'MEMBER',
    resolveStaffLevel: async (_id: string) => 'GENERAL' as const,
    isAssignedLearningClassTeacher: async (_id: string) => false,
    findTeamName: async (_teamId: string | null) => null,
    findAll: async () => Object.values(MOCK_USERS),
    findByEmailIgnoreCase: async (email: string) =>
      Object.values(MOCK_USERS).find((u) => u.email === email) ?? null,
    findTeamMemberIds: async (_teamId: string) => [] as string[],
    findByIdWithProfileByEmail: async (email: string) =>
      Object.values(MOCK_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null,
  };
}
