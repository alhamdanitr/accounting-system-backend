# 03 — Database Specification

## كيانات أساسية

```text
companies
branches
users
roles
permissions
user_roles
devices

products
categories
brands
units
product_prices
product_barcodes

warehouses
stock
stock_movements
stock_transfers
stock_transfer_items
stock_adjustments
stock_counts

customers
customer_transactions
suppliers
supplier_transactions

sales
sale_items
sale_returns
sale_return_items

purchases
purchase_items
purchase_returns
purchase_return_items

payments
receipts
expenses
income
cashboxes
cash_transactions

accounts
journal_entries
journal_entry_lines

quotations
quotation_items
sales_orders
sales_order_items
purchase_orders
purchase_order_items

sync_operations
sync_conflicts
sync_cursors
audit_logs

notifications
whatsapp_messages
whatsapp_templates
printers
backups
settings
```

## قواعد
- كل البيانات التجارية مرتبطة بـ tenant_id.
- المفاتيح الأساسية UUID/ID آمنة للمزامنة.
- unique constraints للباركود والأرقام المرجعية حسب النطاق.
- لا حذف فعلي للعمليات المحاسبية الحساسة؛ يستخدم Cancel/Reverse.
- Stock لا يعدل مباشرة؛ كل تغيير عبر Stock Movement.
- Journal Entries غير قابلة للتلاعب بعد الترحيل إلا بعكس محاسبي.
- فهارس على tenant_id، dates، foreign keys، barcode، status.
