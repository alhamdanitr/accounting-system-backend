import { Controller, Get, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from '@prisma/client';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':tenantId')
  async findLogs(@Param('tenantId') tenantId: string): Promise<AuditLog[]> {
    return this.auditService.findLogs(tenantId);
  }
}
