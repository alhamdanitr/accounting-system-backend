import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateCustomerDto, CreateSaleDto } from './dto/sales.dto';
import { Customer, Sale } from '@prisma/client';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.salesService.createCustomer(dto);
  }

  @Get('customers/:tenantId')
  async findCustomers(@Param('tenantId') tenantId: string): Promise<Customer[]> {
    return this.salesService.findCustomers(tenantId);
  }

  @Post()
  async createSale(@Body() dto: CreateSaleDto): Promise<Sale> {
    return this.salesService.createSale(dto);
  }

  @Get(':tenantId')
  async findSales(@Param('tenantId') tenantId: string): Promise<Sale[]> {
    return this.salesService.findSales(tenantId);
  }
}
