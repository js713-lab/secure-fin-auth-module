/**
 * Database seed script — creates admin account for testing.
 * SECURITY: Password is hashed with bcrypt before storage; never stored in plaintext.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN = {
  username: 'admin',
  email: 'admin@securefin.test',
  password: 'Admin@12345',
  role: 'ADMIN',
};

async function main() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(ADMIN.password, rounds);

  const user = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {
      username: ADMIN.username,
      passwordHash,
      role: ADMIN.role,
      mfaEnabled: true,
    },
    create: {
      username: ADMIN.username,
      email: ADMIN.email,
      passwordHash,
      role: ADMIN.role,
      mfaEnabled: true,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });

  console.log('Seed completed successfully');
  console.log('Admin account:');
  console.log(`  Email   : ${user.email}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Role    : ${user.role}`);
  console.log('  Password: (see seed script / assignment brief — not logged here)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
