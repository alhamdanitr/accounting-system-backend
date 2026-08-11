import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType, SerialStatus } from '@prisma/client';

export interface TransferDto {
  tenantId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  userId: string;
  serialNumbers?: string[];
}

@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(private prisma: PrismaService) {}

  async transferStock(dto: TransferDto) {
    this.logger.log(`Transferring ${dto.quantity} of product ${dto.productId} from ${dto.fromWarehouseId} to ${dto.toWarehouseId}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct from source warehouse
      const sourceBalance = await tx.stockBalance.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.fromWarehouseId, productId: dto.productId } }
      });

      if (!sourceBalance || sourceBalance.quantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock in source warehouse');
      }

      const newSourceQty = sourceBalance.quantity - dto.quantity;
      await tx.stockBalance.update({
        where: { id: sourceBalance.id },
        data: { quantity: newSourceQty }
      });

      // 2. Add to destination warehouse
      const destBalance = await tx.stockBalance.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.toWarehouseId, productId: dto.productId } }
      });

      let newDestQty = dto.quantity;
      if (destBalance) {
        newDestQty += destBalance.quantity;
        await tx.stockBalance.update({
          where: { id: destBalance.id },
          data: { quantity: newDestQty }
        });
      } else {
        await tx.stockBalance.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.toWarehouseId,
            productId: dto.productId,
            quantity: newDestQty
          }
        });
      }

      // 3. Record Movements
      await tx.stockMovement.create({
        data: {
          tenantId: dto.tenantId,
          warehouseId: dto.fromWarehouseId,
          productId: dto.productId,
          type: StockMovementType.TRANSFER_OUT,
          quantity: -dto.quantity,
          balanceAfter: newSourceQty,
          createdById: dto.userId
        }
      });

      await tx.stockMovement.create({
        data: {
          tenantId: dto.tenantId,
          warehouseId: dto.toWarehouseId,
          productId: dto.productId,
          type: StockMovementType.TRANSFER_IN,
          quantity: dto.quantity,
          balanceAfter: newDestQty,
          createdById: dto.userId
        }
      });

      // 4. Update Serial Numbers if provided
      if (dto.serialNumbers && dto.serialNumbers.length > 0) {
        await tx.serialNumber.updateMany({
          where: { 
            tenantId: dto.tenantId,
            productId: dto.productId,
            serialNumber: { in: dto.serialNumbers }
          },
          data: { status: SerialStatus.TRANSFERRED } // In a real system, we'd track current warehouse of serials
        });
      }

      return { success: true, message: 'Stock transferred successfully' };
    });
  }
}
