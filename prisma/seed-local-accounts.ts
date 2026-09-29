import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  if (!['http://localhost:3000', 'http://127.0.0.1:3000'].includes(process.env.NEXTAUTH_URL || '')) {
    throw new Error('Sample accounts may only be provisioned for a localhost application.');
  }
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const staffEmail = process.env.STAFF_EMAIL?.trim().toLowerCase();
  const staffUsername = process.env.STAFF_USERNAME?.trim().toLowerCase();
  const staffPassword = process.env.STAFF_INITIAL_PASSWORD;
  const schema = process.env.CONNECTION_STRING ? new URL(process.env.CONNECTION_STRING).searchParams.get('schema') : null;
  if (!adminEmail || !staffEmail || !adminUsername || !staffUsername ||
    !/^[a-z][a-z0-9_]{2,31}$/.test(adminUsername) || !/^[a-z][a-z0-9_]{2,31}$/.test(staffUsername) ||
    !adminPassword || adminPassword.length < 12 || !staffPassword || staffPassword.length < 12 ||
    adminEmail === staffEmail || adminUsername === staffUsername ||
    !adminEmail.endsWith('.local') || !staffEmail.endsWith('.local') || schema !== 'tpetie_app') {
    throw new Error('Set distinct admin/staff usernames, emails and passwords of at least 12 characters in .env.local.');
  }
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { username: adminUsername, password: await bcrypt.hash(adminPassword, 12), role: 'admin', status: 'active', deletedAt: null },
    create: { email: adminEmail, username: adminUsername, name: 'Quản trị viên', password: await bcrypt.hash(adminPassword, 12), role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: staffEmail },
    update: { username: staffUsername, password: await bcrypt.hash(staffPassword, 12), role: 'staff', status: 'active', deletedAt: null },
    create: { email: staffEmail, username: staffUsername, name: 'Nhân viên mẫu', password: await bcrypt.hash(staffPassword, 12), role: 'staff', points: 0 },
  });
  console.log(`Provisioned sample users: ${adminUsername} (admin), ${staffUsername} (staff).`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Provisioning failed'); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
