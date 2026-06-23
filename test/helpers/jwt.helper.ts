import { sign } from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-secret-vcb-hrm';

export type TestRole = 'MEMBER' | 'LEADER' | 'MANAGER' | 'HR';

export interface TestIdentity {
  sub: string;
  email: string;
  appRole: TestRole;
  token: string;
  bearer: string;
}

export function signTestJwt(payload: {
  sub: string;
  email: string;
  appRole: string;
  expiresIn?: number;
}): string {
  const { expiresIn = 3600, ...rest } = payload;
  return sign(rest, TEST_JWT_SECRET, { expiresIn });
}

function makeIdentity(role: TestRole, email: string, sub: string): TestIdentity {
  const token = signTestJwt({ sub, email, appRole: role });
  return { sub, email, appRole: role, token, bearer: `Bearer ${token}` };
}

export const IDENTITIES: Record<TestRole, TestIdentity> = {
  MEMBER:  makeIdentity('MEMBER',  'test.member@vcb.test',  '00000000-0000-0000-0000-000000000001'),
  LEADER:  makeIdentity('LEADER',  'test.leader@vcb.test',  '00000000-0000-0000-0000-000000000002'),
  MANAGER: makeIdentity('MANAGER', 'test.manager@vcb.test', '00000000-0000-0000-0000-000000000003'),
  HR:      makeIdentity('HR',      'test.hr@vcb.test',      '00000000-0000-0000-0000-000000000004'),
};

export function expiredToken(role: TestRole): string {
  const id = IDENTITIES[role];
  return sign({ sub: id.sub, email: id.email, appRole: id.appRole }, TEST_JWT_SECRET, {
    expiresIn: -1,
  });
}

export function wrongSecretToken(role: TestRole): string {
  const id = IDENTITIES[role];
  return sign({ sub: id.sub, email: id.email, appRole: id.appRole }, 'wrong-secret', {
    expiresIn: 3600,
  });
}
