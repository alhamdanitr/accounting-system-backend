import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SalesService } from './sales.service';
import { CreateCustomerDto, CreateSaleDto } from './dto/sales.dto';
import { Customer, Sale } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    tenantId: string;
  };
};

@ApiTags('sales')
@Controller('sales')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('customers')
  @Permissions('customers.manage')
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Customer> {
    this.assertTenant(request, dto.tenantId);
    return this.salesService.createCustomer(dto);
  }

  @Get('customers/:tenantId')
  @Permissions('customers.view')
  async findCustomers(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Customer[]> {
    this.assertTenant(request, tenantId);
    return this.salesService.findCustomers(tenantId);
  }

  @Post()
  @Permissions('sales.create')
  async createSale(
    @Body() dto: CreateSaleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Sale> {
    this.assertTenant(request, dto.tenantId);
    return this.salesService.createSale({
      ...dto,
      userId: request.user.userId,
    });
  }

  @Get(':tenantId')
  @Permissions('sales.view')
  async findSales(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Sale[]> {
    this.assertTenant(request, tenantId);
    return this.salesService.findSales(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (!request.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'الشركة المطلوبة غير متطابقة مع جلسة المستخدم',
      );
    }
  }
}
