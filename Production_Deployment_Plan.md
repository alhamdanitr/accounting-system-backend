# خطة النشر والتشغيل الشاملة (Production Deployment & Testing Plan)

يوضح هذا المستند خطوات نشر النظام المحاسبي والمخزوني المتكامل في بيئة الإنتاج الحقيقية، واختبار تكامل المنصات الثلاث (الخادم المركزي، تطبيق الأندرويد، وتطبيق الويندوز).

---

## المرحلة 1: نشر الخادم المركزي (Cloud Backend Deployment)

1. **اختيار المضيف السحابي (Cloud VPS):**
   - يُنصح باستخدام سيرفر سحابي (DigitalOcean, AWS, Linode, أو Hetzner) بمواصفات لا تقل عن (2 vCPU, 4GB RAM, Ubuntu 22.04+).
2. **تثبيت Docker و Docker Compose:**
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   ```
3. **جلب المشروع من مستودع GitHub:**
   ```bash
   git clone https://github.com/alhamdanitr/accounting-system-backend.git
   cd accounting-system-backend
   ```
4. **تشغيل الحاويات (Backend + PostgreSQL):**
   - ضبط ملفات البيئة (`.env`) بكلمات مرور سرية وقوية.
   - تشغيل النظام:
     ```bash
     docker-compose up -d
     ```
5. **تأمين الاتصال (SSL / Nginx):**
   - ربط نطاق حقيقي (Domain) بالسيرفر وتثبيت شهادة SSL مجانية عبر `Certbot` و `Nginx Reverse Proxy`.

---

## المرحلة 2: تجهيز وتوزيع تطبيقات الأندرويد والويندوز

### 1. تطبيق الأندرويد (Android App)
- مستودع الكود: [GitHub Android App](https://github.com/alhamdanitr/accounting-system-android)
- **بناء ملف الـ APK التجريبي (Debug/Release APK):**
  ```bash
  cd accounting-system-android
  ./gradlew assembleRelease
  ```
- نقل ملف الـ APK الناتج (`app-release.apk`) إلى الأجهزة اللوحية أو هواتف المبيعات وتثبيته مباشرة، أو رفعه عبر منصة التوزيع الداخلي (Firebase App Distribution).

### 2. تطبيق الويندوز (Windows Desktop App)
- مستودع الكود: [GitHub Windows App](https://github.com/alhamdanitr/accounting-system-windows)
- **بناء وتلخيص تطبيق الـ Desktop (.NET 8):**
  ```bash
  cd accounting-system-windows/src/AccountingSystem.Desktop
  dotnet publish -c Release -r win-x64 --self-contained true
  ```
- تجهيز ملف التثبيت (Installer) عبر أدوات مثل Inno Setup لتسهيل نشره على أجهزة الصراف ونقاط البيع في المحل.

---

## المرحلة 3: اختبار التكامل الشامل (End-to-End Integration Testing)

لتأكيد سلامة الدورة المحاسبية والمخزنية، يتم تنفيذ سيناريو الاختبار التالي:

| الخطوة | الإجراء | المنصة | النتيجة المتوقعة |
| :--- | :--- | :--- | :--- |
| **1** | إنشاء منتج جديد وتحديد السعر والباركود والتتبع | الباك إند / ويندوز | حفظ المنتج وتزامن السجل |
| **2** | قطع فاتورة مبيعات في وضع **Offline** | الأندرويد أو الويندوز | حفظ الفاتورة محلياً وخصم المخزون مؤقتاً |
| **3** | إعادة الاتصال بالإنترنت ومراقبة **Sync Engine** | تلقائي | رفع الفاتورة للسيرفر واعتمادها بدون تعارض |
| **4** | طباعة الفاتورة عبر الطابعة الحرارية (ESC/POS) | الأندرويد / ويندوز | طباعة الترويسة، الأصناف، الإجمالي، والقص التلقائي |
| **5** | مراجعة القيود المحاسبية والأرباح في لوحة التحكم | الباك إند / Dashboard | تحديث الصندوق، الأرباح، وكشف حساب العميل بدقة |

---

## المرحلة 4: الإطلاق التجريبي والمتابعة (Beta Launch)

1. تشغيل النظام في فرع واحد أو كنسخة تجريبية بجانب النظام القديم لمدة أسبوع.
2. مراجعة النسخ الاحتياطي التلقائي (Automated Backups) في منتصف الليل للتأكد من حفظ البيانات.
3. مراقبة سجلات العمليات (Audit Logs) لضمان التزام الموظفين بالصلاحيات الممنوحة (RBAC).
