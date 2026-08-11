import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { code: 'sales.view', name: 'عرض المبيعات' },
    { code: 'sales.create', name: 'إنشاء مبيعات' },
    { code: 'sales.delete', name: 'حذف مبيعات' },
    { code: 'inventory.view', name: 'عرض المخزون' },
    { code: 'inventory.manage', name: 'إدارة المخزون' },
    { code: 'reports.view', name: 'عرض التقارير' },
    { code: 'users.manage', name: 'إدارة المستخدمين' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  console.log('RBAC Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
