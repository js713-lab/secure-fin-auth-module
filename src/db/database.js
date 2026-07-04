/**
 * Lazy Prisma client singleton.
 * SECURITY: Prisma uses parameterized queries — prevents SQL injection.
 *
 * Lazily creating the client keeps Express startup fast and avoids the dev
 * server appearing to hang while native Prisma internals initialise.
 */
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const globalForPrisma = global;

function createPrismaClient() {
  return new PrismaClient({
    log: env.isProduction ? ['error'] : ['error', 'warn'],
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

module.exports = new Proxy(
  {},
  {
    get(_target, property) {
      return getPrismaClient()[property];
    },
  }
);
