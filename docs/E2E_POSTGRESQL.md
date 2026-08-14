# Backend E2E with PostgreSQL

تستخدم اختبارات التكامل قاعدة PostgreSQL مستقلة ولا تتصل بقاعدة الإنتاج. يجب توفير `DATABASE_URL` لقاعدة اختبارية، ثم يطبق السكربت migrations الموجودة قبل تشغيل Jest.

## تشغيل محلي

بعد تشغيل PostgreSQL وإنشاء قاعدة `accounting_system` ومستخدم `accounting`، يمكن تشغيل المجموعة الكاملة بالأمر التالي:

```bash
cp .env.test.example .env.test
DATABASE_URL="postgresql://accounting:accounting_dev_password@localhost:5432/accounting_system?schema=public" pnpm test:e2e:local
```

يستطيع المطور تمرير `DATABASE_URL` مختلفًا لقاعدة اختبارية مؤقتة، وسيظل السكربت يطبق `prisma migrate deploy` قبل الاختبارات. لا ينبغي وضع بيانات اعتماد الإنتاج في `.env.test` أو في إعدادات CI العامة.

## ما تغطيه المجموعة

تغطي المجموعة المصادقة، عزل الشركات، المبيعات، المشتريات، المخزون، المزامنة، التقارير، الطباعة، إعدادات التدقيق، وتكامل WhatsApp. اختبارات المزامنة تستخدم UUID جديدًا لكل تشغيل حتى تكون قابلة لإعادة التنفيذ على نفس قاعدة الاختبار دون تصادمات idempotency أو primary key.

## تشغيل اختبار واحد

```bash
DATABASE_URL="postgresql://accounting:accounting_dev_password@localhost:5432/accounting_system?schema=public" \
  pnpm exec jest test/reports.e2e-spec.ts --config ./test/jest-e2e.json --runInBand
```

الاختبارات لا تنفذ تنظيفًا شاملاً لقاعدة البيانات بعد كل ملف، لذلك يفضل استخدام قاعدة اختبار منفصلة أو إعادة إنشائها عند الحاجة. لا تستخدم هذه الإعدادات مع بيئة الإنتاج.
