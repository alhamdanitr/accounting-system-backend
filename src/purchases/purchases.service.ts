import { Injectable, NotFoundException } from '@nestjs/common';
import { Purchase, PurchaseStatus, StockMovementType, Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto, CreateSupplierDto } from './dto/purchases.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });
  }

  async findSuppliers(tenantId: string): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      where: { tenantId },
    });
  }

  async createPurchase(dto: CreatePurchaseDto): Promise<Purchase> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: dto.warehouseId,
        tenantId: dto.tenantId,
      },
    });
    if (!warehouse) {
      throw new NotFoundException('المستودع غير موجود ضمن الشركة المحددة');
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: dto.supplierId,
          tenantId: dto.tenantId,
        },
      });
      if (!supplier) {
        throw new NotFoundException('المورد غير موجود ضمن الشركة المحددة');
      }
    }

    let subTotal = 0;
    const computedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
      total: number;
    }> = [];

    for (const itemDto of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: itemDto.productId,
          tenantId: dto.tenantId,
        },
      });
      if (!product) {
        throw new NotFoundException(`المنتج بالمعرف ${itemDto.productId} غير موجود`);
      }

      const itemTotal = itemDto.quantity * itemDto.unitPrice - (itemDto.discount || 0);
      subTotal += itemTotal;

      computedItems.push({
        productId: itemDto.productId,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discount: itemDto.discount || 0,
        taxRate: product.taxRate,
        total: itemTotal,
      });
    }

    const orderDiscount = dto.discount || 0;
    const grandTotal = subTotal - orderDiscount;
    const paidAmount = dto.paidAmount;
    const dueAmount = Math.max(0, grandTotal - paidAmount);

    let status: PurchaseStatus = PurchaseStatus.PAID;
    if (paidAmount === 0) {
      status = PurchaseStatus.CREDIT;
    } else if (paidAmount < grandTotal) {
      status = PurchaseStatus.PARTIALLY_PAID;
    }

    const invoiceNumber = `PUR-${Date.now().toString().slice(-8)}`;

    const purchase = await this.prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          userId: dto.userId,
          invoiceNumber,
          status,
          subTotal,
          discount: orderDiscount,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentType: dto.paymentType,
          notes: dto.notes,
          items: {
            create: computedItems,
          },
        },
        include: { items: true, supplier: true },
      });

      for (const item of computedItems) {
        let balanceRecord = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: dto.warehouseId,
              productId: item.productId,
            },
          },
        });

        const newQty = (balanceRecord ? balanceRecord.quantity : 0) + item.quantity;

        if (!balanceRecord) {
          balanceRecord = await tx.stockBalance.create({
            data: {
              tenantId: dto.tenantId,
              warehouseId: dto.warehouseId,
              productId: item.productId,
              quantity: newQty,
            },
          });
        } else {
          await tx.stockBalance.update({
            where: { id: balanceRecord.id },
            data: { quantity: newQty },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
            type: StockMovementType.PURCHASE_IN,
            quantity: item.quantity,
            balanceAfter: newQty,
            referenceId: newPurchase.id,
            notes: `فاتورة مشتريات رقم ${invoiceNumber}`,
            createdById: dto.userId,
          },
        });
      }

      if (dto.supplierId && dueAmount > 0) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: {
            balance: {
              increment: dueAmount,
            },
          },
        });

        await tx.supplierTransaction.create({
          data: {
            tenantId: dto.tenantId,
            supplierId: dto.supplierId,
            amount: dueAmount,
            type: 'PURCHASE',
            referenceId: newPurchase.id,
            notes: `متبقي فاتورة مشتريات رقم ${invoiceNumber}`,
          },
        });
      }

      return newPurchase;
    });

    return purchase;
  }

  async findPurchases(tenantId: string): Promise<Purchase[]> {
    return this.prisma.purchase.findMany({
      where: { tenantId },
      include: { items: { include: { product: true } }, supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
