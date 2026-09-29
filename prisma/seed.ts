import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { loadEnvConfig } from '@next/env';
import { parseProvisioningAccounts } from './provisioning-config';

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const accounts = parseProvisioningAccounts(process.env);
  const prepared = await Promise.all(accounts.map(async ({ password, ...details }) => ({
    ...details, passwordHash: await bcrypt.hash(password, 12),
  })));
  await prisma.$transaction(async (tx) => {
    for (const account of prepared) {
      const existing = await tx.user.findFirst({ where: { OR: [{ email: account.email }, { username: account.username }] } });
      if (existing) {
        if (existing.email !== account.email || existing.username !== account.username || existing.role !== account.role || existing.deletedAt) {
          throw new Error(`An existing account conflicts with ${account.role} provisioning. Resolve it in account management.`);
        }
        continue;
      }
      await tx.user.create({ data: { email: account.email, username: account.username,
        name: account.name, password: account.passwordHash, role: account.role, status: 'active', points: 0 } });
    }
  });
  console.log(`Account provisioning checked: ${accounts.map((account) => account.role).join(', ')}. Existing accounts were not changed.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Provisioning failed'); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
