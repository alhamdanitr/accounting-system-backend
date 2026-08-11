import { Injectable } from '@nestjs/common';
import { AuditAction, AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  tenantId: string;
  userId?: string;
  deviceId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  before?: string;
  after?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        deviceId: dto.deviceId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        before: dto.before,
        after: dto.after,
      },
    });
  }

  async findLogs(tenantId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      include: { user: true, device: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
