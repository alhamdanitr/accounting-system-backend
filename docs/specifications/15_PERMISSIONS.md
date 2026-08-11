# 15 — Permissions

## Roles
Owner / Manager / Cashier / Warehouse / Accountant / Viewer

## Granular Permissions
```text
can_create_sale
can_edit_sale
can_cancel_sale
can_return_sale
can_view_profit
can_view_purchase_price
can_edit_purchase_price
can_manage_products
can_manage_inventory
can_adjust_stock
can_manage_users
can_manage_settings
can_approve_discount
can_view_reports
can_export_reports
can_send_whatsapp
```

## قواعد
- Deny by default.
- كل Endpoint يتحقق من الصلاحية.
- UI يخفي/يعطل الوظائف غير المسموحة.
- UI ليس طبقة الأمان الوحيدة.
- الصلاحيات الحساسة تسجل في Audit Log.
