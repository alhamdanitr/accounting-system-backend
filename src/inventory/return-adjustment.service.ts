import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '@prisma/client';

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

  constructor(private prisma: PrismaService) {}

  async processReturn(dto: ProcessReturnDto) {
    this.logger.log(`Processing return for tenant ${dto.tenantId}, type: ${dto.isCustomerReturn ? 'Customer Return' : 'Supplier Return'}`);

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const balance = await tx.stockBalance.findUnique({
          where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: item.productId } }
        });

        const currentQty = balance ? balance.quantity : 0;
        // Customer return increases stock, Supplier return decreases stock
        const qtyChange = dto.isCustomerReturn ? item.quantity : -item.quantity;
        const newQty = currentQty + qtyChange;

        if (newQty < 0) {
          throw new BadRequestException(`Insufficient stock for return on product ${item.productId}`);
        }

        if (balance) {
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { quantity: newQty }
          });
        } else {
          await tx.stockBalance.create({
            data: {
              tenantId: dto.tenantId,
              warehouseId: dto.warehouseId,
              productId: item.productId,
              quantity: newQty
            }
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
            type: dto.isCustomerReturn ? StockMovementType.SALE_RETURN_IN : StockMovementType.PURCHASE_RETURN_OUT,
            quantity: qtyChange,
            balanceAfter: newQty,
            notes: item.reason,
            createdById: dto.userId
          }
        });
      }

      return { success: true, message: 'Return processed successfully and stock updated' };
    });
  }

  async processStockAdjustment(dto: StockAdjustmentDto) {
    this.logger.log(`Processing stock adjustment for product ${dto.productId} in warehouse ${dto.warehouseId}`);

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.stockBalance.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } }
      });

      const systemQty = balance ? balance.quantity : 0;
      const difference = dto.actualQuantity - systemQty;

      if (difference === 0) {
        return { success: true, message: 'No adjustment needed, actual quantity matches system.' };
      }

      if (balance) {
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: { quantity: dto.actualQuantity }
        });
      } else {
        await tx.stockBalance.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.warehouseId,
            productId: dto.productId,
            quantity: dto.actualQuantity
          }
        });
      }

      await tx.stockMovement.create({
        data: {
          tenantId: dto.tenantId,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          type: StockMovementType.ADJUSTMENT,
          quantity: difference,
          balanceAfter: dto.actualQuantity,
          notes: `Stock Taking Adjustment: ${dto.reason}`,
          createdById: dto.userId
        }
      });

      return { success: true, difference, message: 'Stock adjustment completed successfully' };
    });
  }
}
