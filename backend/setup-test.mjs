import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const p = new PrismaClient();

const tenantId = '148fe052-9fb8-49bc-9195-54fad2e39b54';

// Check client user
const cu = await p.clientUser.findFirst({
  where: { tenantId, email: 'musteri@ornekmusteri.com.tr' },
});

console.log('CLIENT_USER ID:', cu?.id);
console.log('HAS_PASSWORD:', !!cu?.passwordHash);
console.log('IS_ACTIVE:', cu?.isActive);

// Reset password to known value
if (cu) {
  const newHash = await argon2.hash('123456');
  await p.clientUser.update({
    where: { id: cu.id },
    data: { passwordHash: newHash },
  });
  console.log('PASSWORD RESET TO: 123456');
  
  // Verify
  const verify = await argon2.verify(newHash, '123456');
  console.log('VERIFY:', verify);
}

await p.$disconnect();
