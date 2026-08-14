import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeviceStatus, SyncOperationStatus } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import type { CreateProductDto } from '../products/dto/product.dto';
import { SalesService } from '../sales/sales.service';
import type { CreateCustomerDto } from '../sales/dto/sales.dto';
import { SyncOperationItemDto, SyncPushDto } from './dto/sync.dto';

const SUPPORTED_ENTITY_TYPES = new Set(['PRODUCT', 'CUSTOMER']);
const CREATE_OPERATION = 'CREATE';

type SyncPayload = Record<string, unknown>;

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly salesService: SalesService,
  ) {}

  async pushOperations(dto: SyncPushDto) {
    const device = await this.prisma.device.findFirst({
      where: { id: dto.deviceId, tenantId: dto.tenantId, status: DeviceStatus.ACTIVE },
    });
    if (!device) {
      throw new NotFoundException('الجهاز غير مسجل أو غير نشط ضمن الشركة المحددة');
    }

    await this.prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
    const results: Array<Record<string, unknown>> = [];

    for (const operation of dto.operations) {
      const existing = await this.prisma.syncOperation.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: dto.tenantId, idempotencyKey: operation.idempotencyKey } },
      });

      if (existing?.status === SyncOperationStatus.SYNCED) {
        results.push({ idempotencyKey: operation.idempotencyKey, operationId: existing.id, status: existing.status, duplicate: true });
        continue;
      }
      if (existing?.status === SyncOperationStatus.CONFLICT) {
        results.push({ idempotencyKey: operation.idempotencyKey, operationId: existing.id, status: existing.status, retryable: false });
        continue;
      }

      const syncOperation = existing
        ? await this.prisma.syncOperation.update({
            where: { id: existing.id },
            data: { status: SyncOperationStatus.SYNCING, errorMessage: null },
          })
        : await this.prisma.syncOperation.create({
            data: {
              tenantId: dto.tenantId,
              deviceId: dto.deviceId,
              entityType: operation.entityType,
              entityId: operation.entityId,
              operationType: operation.operationType,
              payload: operation.payload,
              idempotencyKey: operation.idempotencyKey,
              status: SyncOperationStatus.SYNCING,
            },
          });

      try {
        const payload = this.parsePayload(operation.payload);
        await this.applyOperation(dto.tenantId, operation, payload);
        const processed = await this.prisma.syncOperation.update({
          where: { id: syncOperation.id },
          data: { status: SyncOperationStatus.SYNCED, processedAt: new Date(), errorMessage: null },
        });
        results.push({ idempotencyKey: operation.idempotencyKey, operationId: processed.id, status: processed.status, sequence: processed.sequence.toString() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل غير معروف أثناء تطبيق العملية';
        const failed = await this.prisma.syncOperation.update({
          where: { id: syncOperation.id },
          data: { status: SyncOperationStatus.FAILED, errorMessage: message },
        });
        results.push({ idempotencyKey: operation.idempotencyKey, operationId: failed.id, status: failed.status, errorMessage: message, retryable: true });
      }
    }

    return {
      success: results.every((result) => result.status === SyncOperationStatus.SYNCED),
      processedCount: results.length,
      results,
    };
  }

  async pullOperations(tenantId: string, deviceId: string, cursor = '0', limit = 100) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId, status: DeviceStatus.ACTIVE },
    });
    if (!device) {
      throw new NotFoundException('الجهاز غير مسجل أو غير نشط ضمن الشركة المحددة');
    }

    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
    let sequenceCursor: bigint;
    try {
      sequenceCursor = BigInt(cursor);
    } catch {
      throw new BadRequestException('مؤشر المزامنة غير صالح');
    }

    const operations = await this.prisma.syncOperation.findMany({
      where: { tenantId, deviceId: { not: deviceId }, status: SyncOperationStatus.SYNCED, sequence: { gt: sequenceCursor } },
      orderBy: { sequence: 'asc' },
      take: normalizedLimit,
    });

    const nextCursor = operations.length ? operations[operations.length - 1].sequence.toString() : cursor;
    return { success: true, operations, nextCursor, hasMore: operations.length === normalizedLimit };
  }

  private parsePayload(payload: string): SyncPayload {
    try {
      const parsed = JSON.parse(payload);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('بيانات العملية يجب أن تكون JSON object');
      return parsed as SyncPayload;
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? `حمولة المزامنة غير صالحة: ${error.message}` : 'حمولة المزامنة غير صالحة');
    }
  }

  private async applyOperation(tenantId: string, operation: SyncOperationItemDto, payload: SyncPayload) {
    const entityType = operation.entityType.toUpperCase();
    const operationType = operation.operationType.toUpperCase();
    if (!SUPPORTED_ENTITY_TYPES.has(entityType) || operationType !== CREATE_OPERATION) {
      throw new BadRequestException(`عملية المزامنة غير مدعومة بعد: ${entityType}/${operationType}`);
    }
    if (!isUUID(operation.entityId)) {
      throw new BadRequestException('entityId يجب أن يكون UUID صالحاً عند إنشاء كيان قابل للمزامنة');
    }

    const normalizedPayload = { ...payload, id: operation.entityId, tenantId };
    if (entityType === 'PRODUCT') {
      const existing = await this.prisma.product.findFirst({ where: { id: operation.entityId, tenantId } });
      if (!existing) await this.productsService.createProduct(normalizedPayload as unknown as CreateProductDto);
      return;
    }

    const existing = await this.prisma.customer.findFirst({ where: { id: operation.entityId, tenantId } });
    if (!existing) await this.salesService.createCustomer(normalizedPayload as unknown as CreateCustomerDto);
  }
}
