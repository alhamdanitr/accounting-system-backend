import { Controller, ForbiddenException, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { AuditLog } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':tenantId')
  @Permissions('audit.view')
  async findLogs(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AuditLog[]> {
    if (request.user.tenantId !== tenantId) {
      throw new ForbiddenException('لا يمكن الوصول إلى سجل تدقيق شركة أخرى');
    }
    return this.auditService.findLogs(tenantId);
  }
}
