import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD (at least 16 characters) before provisioning an admin.');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Admin email already exists. Refusing to change an existing account automatically.');
  await prisma.user.create({
    data: {
      email,
      name: 'Quản trị viên',
      password: await bcrypt.hash(password, 12),
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Admin account provisioned. Remove ADMIN_INITIAL_PASSWORD from the environment.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Provisioning failed');
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
