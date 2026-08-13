import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncPushDto } from './dto/sync.dto';
import { DeviceStatus, SyncOperationStatus } from '@prisma/client';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async pushOperations(dto: SyncPushDto) {
    const device = await this.prisma.device.findFirst({
      where: {
        id: dto.deviceId,
        tenantId: dto.tenantId,
        status: DeviceStatus.ACTIVE,
      },
    });
    if (!device) {
      throw new NotFoundException('الجهاز غير مسجل أو غير نشط ضمن الشركة المحددة');
    }

    const results = [];

    for (const op of dto.operations) {
      // التحقق من Idempotency Key لمنع تكرار العملية
      let existingOp = await this.prisma.syncOperation.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: dto.tenantId,
            idempotencyKey: op.idempotencyKey,
          },
        },
      });

      if (!existingOp) {
        existingOp = await this.prisma.syncOperation.create({
          data: {
            tenantId: dto.tenantId,
            deviceId: dto.deviceId,
            entityType: op.entityType,
            entityId: op.entityId,
            operationType: op.operationType,
            payload: op.payload,
            idempotencyKey: op.idempotencyKey,
            status: SyncOperationStatus.SYNCED,
            processedAt: new Date(),
          },
        });
      }

      results.push({
        idempotencyKey: op.idempotencyKey,
        operationId: existingOp.id,
        status: existingOp.status,
      });
    }

    return {
      success: true,
      processedCount: results.length,
      results,
    };
  }

  async pullOperations(tenantId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        tenantId,
        status: DeviceStatus.ACTIVE,
      },
    });
    if (!device) {
      throw new NotFoundException('الجهاز غير مسجل أو غير نشط ضمن الشركة المحددة');
    }

    // استرجاع العمليات الحديثة أو غير المزامنة للجهاز
    const operations = await this.prisma.syncOperation.findMany({
      where: {
        tenantId,
        deviceId: { not: deviceId }, // جلب عمليات الأجهزة الأخرى
        status: SyncOperationStatus.SYNCED,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      success: true,
      operations,
    };
  }
}
