# 02 — Architecture

## المعمارية
Clean Architecture + Package by Feature.

```text
UI
 ↓
Presentation
 ↓
UseCase
 ↓
Repository
 ↓
Engine/Data Source
 ↓
Local DB / API
```

## المنصات
- Android: Kotlin + Jetpack Compose + Room + Hilt + WorkManager.
- Windows: Kotlin + Compose Multiplatform قدر الإمكان.
- Backend: NestJS + PostgreSQL + Prisma.

## المبادئ
- لا Business Logic معقد داخل ViewModel.
- Domain مستقل عن UI.
- Repository abstraction.
- Local-first.
- Server authoritative للتحقق من العمليات الحساسة.
- كل عملية حساسة قابلة للتدقيق.

## الوحدات
auth, products, inventory, sales, purchases, customers, suppliers, accounting, reports, sync, printing, whatsapp, settings.

## التوسع
تصميم يدعم Company/Branch/Warehouse/Device/Multi-Tenant من البداية.
