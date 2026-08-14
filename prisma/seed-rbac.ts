import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { code: 'sales.view', name: 'عرض المبيعات' },
    { code: 'sales.create', name: 'إنشاء مبيعات' },
    { code: 'sales.delete', name: 'حذف مبيعات' },
    { code: 'inventory.view', name: 'عرض المخزون' },
    { code: 'inventory.manage', name: 'إدارة المخزون' },
    { code: 'products.view', name: 'عرض المنتجات' },
    { code: 'products.manage', name: 'إدارة المنتجات' },
    { code: 'customers.view', name: 'عرض العملاء' },
    { code: 'customers.manage', name: 'إدارة العملاء' },
    { code: 'returns.view', name: 'عرض المرتجعات' },
    { code: 'returns.manage', name: 'إدارة المرتجعات' },
    { code: 'reports.view', name: 'عرض التقارير' },
    { code: 'accounting.view', name: 'عرض المحاسبة' },
    { code: 'accounting.manage', name: 'إدارة المحاسبة' },
    { code: 'users.view', name: 'عرض المستخدمين' },
    { code: 'users.manage', name: 'إدارة المستخدمين' },
    { code: 'roles.manage', name: 'إدارة الأدوار والصلاحيات' },
    { code: 'companies.view', name: 'عرض الشركات' },
    { code: 'companies.manage', name: 'إدارة الشركات' },
    { code: 'branches.view', name: 'عرض الفروع' },
    { code: 'branches.manage', name: 'إدارة الفروع' },
    { code: 'settings.view', name: 'عرض الإعدادات' },
    { code: 'settings.manage', name: 'إدارة الإعدادات' },
    { code: 'audit.view', name: 'عرض سجل التدقيق' },
    { code: 'printing.view', name: 'طباعة المستندات' },
    { code: 'whatsapp.send', name: 'إرسال رسائل WhatsApp' },
    { code: 'sync.push', name: 'رفع عمليات المزامنة' },
    { code: 'sync.pull', name: 'سحب عمليات المزامنة' },
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
