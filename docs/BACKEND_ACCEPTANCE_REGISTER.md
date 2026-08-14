# Backend Professional Acceptance Register

هذا السجل هو المرجع التنفيذي لإغلاق البنود العشرين المفتوحة في `BACKEND_PROFESSIONALISM_PLAN.md`. لا يُعتبر أي بند مغلقًا إلا بوجود **تنفيذ فعلي، اختبار أو فحص مناسب، ودليل commit أو artifact قابل للمراجعة**.

| # | البند | معيار الإغلاق القابل للتحقق | الدليل المطلوب | الحالة |
|---:|---|---|---|---|
| 1 | تنظيف الملفات الغريبة وbuild artifacts | لا توجد artifacts أو ملفات غير مقصودة في الجذر أو التتبع | حذف الملف الغريب و`dist/tsconfig.build.tsbuildinfo`، والتحقق عبر Git | CLOSED |
| 2 | `.gitignore` شامل ومختبر | يستثني build/dist/node_modules/logs/env/coverage دون إخفاء ملفات المصدر | مراجعة `.gitignore` وفحص المسارات المحلية | CLOSED |
| 3 | حماية فرع `main` | Pull Request ومراجعة وCI إلزامية | GitHub Branch Protection: مراجعة واحدة، `quality` إلزامي، conversation resolution، ومنع force-push/delete | CLOSED |
| 4 | حماية كل endpoints | كل controller محمي بـ JWT وRBAC أو موثق كمسار public | `node scripts/check-route-guards.mjs` نجح؛ public allowlist محصور في auth/health وbootstrap company/user | CLOSED |
| 5 | عزل tenant بنسبة 100% | رفض cross-tenant في كل الوحدات الحساسة | E2E cross-tenant matrix | OPEN |
| 6 | عدم وجود أسرار | لا أسرار في الكود أو تاريخ Git | Gitleaks/secret scan و`git log` | OPEN |
| 7 | فحص الثغرات في كل PR | workflow آلي للتبعيات والأسرار | Quality Gate يعمل على push وPR، ويشمل route audit؛ إضافة Gitleaks/dependency audit المتخصصة ما زالت مطلوبة | IN_PROGRESS |
| 8 | Response/Error envelope موحد | كل النجاح والأخطاء عبر شكل موحد موثق | Global interceptor/filter واختبارات API | OPEN |
| 9 | Swagger دقيق 100% | كل endpoint وDTO موثق ومطابق للعقد | Swagger مفعّل و`docs/API_CONTRACT.md` موجود، لكن تغطية DTO/endpoint الكاملة لم تُثبت بعد | IN_PROGRESS |
| 10 | لا `console.log` | استخدام logger منظم فقط | grep + lint rule | OPEN |
| 11 | تغطية لا تقل عن 75% | حد coverage مفروض في CI | Jest coverage report | OPEN |
| 12 | تغطية المحرك المحاسبي 100% | edge cases وتوازن المدين والدائن مغطاة | unit tests وتقارير coverage | OPEN |
| 13 | اختبار حمل موثق | نتائج k6/Artillery مقبولة ومؤرشفة | load-test report | OPEN |
| 14 | لا نشر يدوي | النشر يمر عبر pipeline قابل للتدقيق | deployment workflow | OPEN |
| 15 | اختبار استعادة النسخ الاحتياطية | restore فعلي ناجح وموثق | backup/restore runbook وlog | OPEN |
| 16 | تنبيهات الإنتاج | تنبيه قابل للتحقق عند خطأ حرج | monitoring/alert configuration | OPEN |
| 17 | توثيق تشغيل كامل | مطور جديد يشغل المشروع من README/docs فقط | clean-environment walkthrough | OPEN |
| 18 | OpenAPI منشور تلقائيًا | توليد ونشر `openapi.json` مع كل إصدار | CI artifact أو deployment artifact | OPEN |
| 19 | كل استدعاءات العملاء موثقة | Android وWindows لا يستخدمان endpoint خارج العقد | contract inventory وgrep clients | OPEN |
| 20 | سياسة توافق وإيقاف تدريجي | versioning/deprecation policy تمنع كسر العملاء | policy doc واختبار backward compatibility | OPEN |

## قاعدة الإغلاق

لا تنتقل الخطة إلى Android قبل أن تصبح البنود 1–20 في هذا السجل `CLOSED`، مع ربط كل بند بأمر تحقق أو تقرير أو commit. إذا تعذر إغلاق بند بسبب اعتماد خارجي مثل حساب مراقبة إنتاج أو مفتاح توقيع، يسجل السبب كـ `BLOCKED` ولا يُسمى مكتملًا.
