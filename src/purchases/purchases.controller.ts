import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, CreateSupplierDto } from './dto/purchases.dto';
import { Purchase, Supplier } from '@prisma/client';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('suppliers')
  async createSupplier(@Body() dto: CreateSupplierDto): Promise<Supplier> {
    return this.purchasesService.createSupplier(dto);
  }

  @Get('suppliers/:tenantId')
  async findSuppliers(@Param('tenantId') tenantId: string): Promise<Supplier[]> {
    return this.purchasesService.findSuppliers(tenantId);
  }

  @Post()
  async createPurchase(@Body() dto: CreatePurchaseDto): Promise<Purchase> {
    return this.purchasesService.createPurchase(dto);
  }

  @Get(':tenantId')
  async findPurchases(@Param('tenantId') tenantId: string): Promise<Purchase[]> {
    return this.purchasesService.findPurchases(tenantId);
  }
}
