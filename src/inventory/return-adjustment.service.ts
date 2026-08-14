import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReturnItemDto {
  productId: string;
  quantity: number;
  reason: string;
}

export interface ProcessReturnDto {
  tenantId: string;
  originalSaleId?: string;
  originalPurchaseId?: string;
  warehouseId: string;
  userId: string;
  items: ReturnItemDto[];
  isCustomerReturn: boolean;
}

export interface StockAdjustmentDto {
  tenantId: string;
  warehouseId: string;
  productId: string;
  actualQuantity: number;
  reason: string;
  userId: string;
}

@Injectable()
export class ReturnAdjustmentService {
  private readonly logger = new Logger(ReturnAdjustmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processReturn(dto: ProcessReturnDto) {
    if (!dto.items.length) throw new BadRequestException('يجب أن يحتوي المرتجع على صنف واحد على الأقل');
    if (dto.items.some((item) => item.quantity <= 0 || !item.reason?.trim())) {
      throw new BadRequestException('كمية وسبب كل صنف في المرتجع مطلوبان ويجب أن تكون الكمية أكبر من صفر');
    }
    if (dto.isCustomerReturn && !dto.originalSaleId) throw new BadRequestException('فاتورة البيع الأصلية مطلوبة لمرتجع العميل');
    if (!dto.isCustomerReturn && !dto.originalPurchaseId) throw new BadRequestException('فاتورة الشراء الأصلية مطلوبة لمرتجع المورد');

    return this.prisma.$transaction(async (tx) => {
      const [warehouse, user] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId: dto.tenantId, active: true } }),
        tx.user.findFirst({ where: { id: dto.userId, tenantId: dto.tenantId, status: 'ACTIVE' } }),
      ]);
      if (!warehouse) throw new NotFoundException('المستودع غير موجود أو غير نشط ضمن الشركة المحددة');
      if (!user) throw new NotFoundException('المستخدم غير موجود أو غير نشط ضمن الشركة المحددة');

      const source = dto.isCustomerReturn
        ? await tx.sale.findFirst({ where: { id: dto.originalSaleId, tenantId: dto.tenantId }, include: { items: true } })
        : await tx.purchase.findFirst({ where: { id: dto.originalPurchaseId, tenantId: dto.tenantId }, include: { items: true } });
      if (!source) throw new NotFoundException('الفاتورة الأصلية غير موجودة ضمن الشركة المحددة');

      const sourceItems = new Map(source.items.map((item) => [item.productId, item]));
      const requestedByProduct = new Map<string, number>();
      for (const item of dto.items) requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);

      const existingReturns = dto.isCustomerReturn
        ? await tx.saleReturnItem.findMany({ where: { return: { saleId: dto.originalSaleId, tenantId: dto.tenantId } } })
        : await tx.purchaseReturnItem.findMany({ where: { return: { purchaseId: dto.originalPurchaseId, tenantId: dto.tenantId } } });
      const alreadyReturned = new Map<string, number>();
      for (const item of existingReturns) alreadyReturned.set(item.productId, (alreadyReturned.get(item.productId) ?? 0) + item.quantity);

      const preparedItems = dto.items.map((item) => {
        const sourceItem = sourceItems.get(item.productId);
        if (!sourceItem) throw new BadRequestException(`الصنف ${item.productId} غير موجود في الفاتورة الأصلية`);
        const totalReturned = (alreadyReturned.get(item.productId) ?? 0) + (requestedByProduct.get(item.productId) ?? 0);
        if (totalReturned > sourceItem.quantity) {
          throw new BadRequestException(`الكمية المرتجعة للصنف ${item.productId} تتجاوز كمية الفاتورة الأصلية`);
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: sourceItem.unitPrice,
          total: item.quantity * sourceItem.unitPrice,
          reason: item.reason.trim(),
        };
      });
      const total = preparedItems.reduce((sum, item) => sum + item.total, 0);

      const returnRecord = dto.isCustomerReturn
        ? await tx.saleReturn.create({
            data: {
              tenantId: dto.tenantId,
              saleId: dto.originalSaleId!,
              warehouseId: dto.warehouseId,
              userId: dto.userId,
              total,
              items: { create: preparedItems },
            },
            include: { items: true },
          })
        : await tx.purchaseReturn.create({
            data: {
              tenantId: dto.tenantId,
              purchaseId: dto.originalPurchaseId!,
              warehouseId: dto.warehouseId,
              userId: dto.userId,
              total,
              items: { create: preparedItems },
            },
            include: { items: true },
          });

      for (const item of preparedItems) {
        const qtyChange = dto.isCustomerReturn ? item.quantity : -item.quantity;
        if (qtyChange > 0) {
          await tx.stockBalance.upsert({
            where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: item.productId } },
            update: { quantity: { increment: qtyChange } },
            create: { tenantId: dto.tenantId, warehouseId: dto.warehouseId, productId: item.productId, quantity: qtyChange },
          });
        } else {
          const balance = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: item.productId } } });
          if (!balance) throw new BadRequestException(`لا يوجد رصيد للصنف ${item.productId} لإتمام مرتجع المورد`);
          const updated = await tx.stockBalance.updateMany({
            where: { id: balance.id, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw new BadRequestException(`الرصيد غير كافٍ للصنف ${item.productId}`);
        }

        const updatedBalance = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: item.productId } } });
        await tx.stockMovement.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
            type: dto.isCustomerReturn ? StockMovementType.SALE_RETURN_IN : StockMovementType.PURCHASE_RETURN_OUT,
            quantity: qtyChange,
            balanceAfter: updatedBalance?.quantity ?? 0,
            notes: item.reason,
            createdById: dto.userId,
          },
        });
      }

      this.logger.log(`Return ${returnRecord.id} processed for tenant ${dto.tenantId}`);
      return { success: true, returnId: returnRecord.id, total, type: dto.isCustomerReturn ? 'SALE_RETURN' : 'PURCHASE_RETURN', items: returnRecord.items };
    });
  }

  async processStockAdjustment(dto: StockAdjustmentDto) {
    if (dto.actualQuantity < 0) throw new BadRequestException('الكمية الفعلية لا يمكن أن تكون سالبة');
    return this.prisma.$transaction(async (tx) => {
      const [warehouse, product, user] = await Promise.all([
        tx.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId: dto.tenantId, active: true } }),
        tx.product.findFirst({ where: { id: dto.productId, tenantId: dto.tenantId } }),
        tx.user.findFirst({ where: { id: dto.userId, tenantId: dto.tenantId, status: 'ACTIVE' } }),
      ]);
      if (!warehouse) throw new NotFoundException('المستودع غير موجود أو غير نشط ضمن الشركة المحددة');
      if (!product) throw new NotFoundException('المنتج غير موجود ضمن الشركة المحددة');
      if (!user) throw new NotFoundException('المستخدم غير موجود أو غير نشط ضمن الشركة المحددة');

      const balance = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } } });
      const systemQty = balance?.quantity ?? 0;
      const difference = dto.actualQuantity - systemQty;
      if (difference === 0) return { success: true, difference: 0, message: 'لا يلزم تعديل؛ الكمية مطابقة' };

      const updatedBalance = balance
        ? await tx.stockBalance.update({ where: { id: balance.id }, data: { quantity: dto.actualQuantity } })
        : await tx.stockBalance.create({ data: { tenantId: dto.tenantId, warehouseId: dto.warehouseId, productId: dto.productId, quantity: dto.actualQuantity } });
      await tx.stockMovement.create({
        data: {
          tenantId: dto.tenantId,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          type: StockMovementType.ADJUSTMENT,
          quantity: difference,
          balanceAfter: updatedBalance.quantity,
          notes: `Stock Taking Adjustment: ${dto.reason}`,
          createdById: dto.userId,
        },
      });
      return { success: true, difference, message: 'تمت تسوية المخزون بنجاح' };
    });
  }
}
