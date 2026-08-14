import { Injectable, NotFoundException } from '@nestjs/common';
import { StockMovement, StockMovementType, Warehouse } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, StockAdjustmentDto, StockMovementDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId: dto.tenantId },
      });
      if (!branch) {
        throw new NotFoundException('الفرع غير موجود ضمن الشركة المحددة');
      }
    }

    return this.prisma.warehouse.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async findWarehouses(tenantId: string): Promise<Warehouse[]> {
    return this.prisma.warehouse.findMany({
      where: { tenantId, active: true },
      include: { branch: true },
    });
  }

  async recordStockMovement(dto: StockMovementDto): Promise<StockMovement> {
    // التحقق من وجود المخزون والمنتج
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId: dto.tenantId, active: true },
    });
    if (!warehouse) {
      throw new NotFoundException('المستودع غير موجود ضمن الشركة المحددة');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: dto.tenantId },
    });
    if (!product) {
      throw new NotFoundException('المنتج غير موجود ضمن الشركة المحددة');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, tenantId: dto.tenantId, status: 'ACTIVE' },
      });
      if (!user) {
        throw new NotFoundException('المستخدم غير موجود أو غير نشط ضمن الشركة المحددة');
      }
    }

    // جلب أو إنشاء رصيد المخزون الحالي في المستودع
    let stockBalance = await this.prisma.stockBalance.findFirst({
      where: {
        tenantId: dto.tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
      },
    });

    const currentQty = stockBalance ? stockBalance.quantity : 0;
    const newBalance = currentQty + dto.quantity;

    // تحديث أو إنشاء الرصيد
    if (!stockBalance) {
      stockBalance = await this.prisma.stockBalance.create({
        data: {
          tenantId: dto.tenantId,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          quantity: newBalance,
        },
      });
    } else {
      await this.prisma.stockBalance.update({
        where: { id: stockBalance.id },
        data: { quantity: newBalance },
      });
    }

    // تسجيل الحركة في سجل الحركات المخزنية (StockMovement Ledger)
    const movement = await this.prisma.stockMovement.create({
      data: {
        tenantId: dto.tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        balanceAfter: newBalance,
        referenceId: dto.referenceId,
        notes: dto.notes,
        createdById: dto.userId,
      },
    });

    return movement;
  }

  async adjustStock(dto: StockAdjustmentDto): Promise<StockMovement> {
    let stockBalance = await this.prisma.stockBalance.findFirst({
      where: {
        tenantId: dto.tenantId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
      },
    });

    const currentQty = stockBalance ? stockBalance.quantity : 0;
    const diff = dto.actualQuantity - currentQty;

    if (diff === 0) {
      throw new Error('الكمية الفعلية تطابق رصيد النظام الحالي');
    }

    return this.recordStockMovement({
      tenantId: dto.tenantId,
      warehouseId: dto.warehouseId,
      productId: dto.productId,
      type: StockMovementType.ADJUSTMENT,
      quantity: diff,
      notes: `تسوية جرد مخزني: ${dto.reason}`,
      userId: dto.userId,
    });
  }

  async getStockBalance(warehouseId: string, productId: string, tenantId: string) {
    return this.prisma.stockBalance.findFirst({
      where: {
        tenantId,
        warehouseId,
        productId,
      },
      include: { product: true, warehouse: true },
    });
  }
}
