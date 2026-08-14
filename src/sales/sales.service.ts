import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Customer, PaymentType, Sale, SaleStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CreateSaleDto } from './dto/sales.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(dto: CreateCustomerDto): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        creditLimit: dto.creditLimit || 0,
      },
    });
  }

  async findCustomers(tenantId: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { tenantId },
    });
  }

  async createSale(dto: CreateSaleDto): Promise<Sale> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: dto.warehouseId,
        tenantId: dto.tenantId,
      },
    });
    if (!warehouse) {
      throw new NotFoundException('المستودع غير موجود');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          tenantId: dto.tenantId,
        },
      });
      if (!branch) {
        throw new NotFoundException('الفرع غير موجود ضمن الشركة المحددة');
      }
    }

    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.userId,
          tenantId: dto.tenantId,
          status: 'ACTIVE',
        },
      });
      if (!user) {
        throw new NotFoundException('المستخدم غير موجود أو غير نشط ضمن الشركة المحددة');
      }
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          tenantId: dto.tenantId,
        },
      });
      if (!customer) {
        throw new NotFoundException('العميل غير موجود ضمن الشركة المحددة');
      }
    }

    let subTotal = 0;
    const computedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
      total: number;
    }> = [];

    for (const itemDto of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: itemDto.productId,
          tenantId: dto.tenantId,
        },
      });
      if (!product) {
        throw new NotFoundException(`المنتج بالمعرف ${itemDto.productId} غير موجود`);
      }

      const stockBalance = await this.prisma.stockBalance.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.warehouseId,
            productId: itemDto.productId,
          },
        },
      });

      const availableQty = stockBalance ? stockBalance.quantity : 0;
      if (availableQty < itemDto.quantity) {
        throw new BadRequestException(`الكمية غير متاحة للمنتج: ${product.arabicName} (المتاح: ${availableQty})`);
      }

      const itemTotal = itemDto.quantity * itemDto.unitPrice - (itemDto.discount || 0);
      subTotal += itemTotal;

      computedItems.push({
        productId: itemDto.productId,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discount: itemDto.discount || 0,
        taxRate: product.taxRate,
        total: itemTotal,
      });
    }

    const orderDiscount = dto.discount || 0;
    const grandTotal = subTotal - orderDiscount;
    const paidAmount = dto.paidAmount;
    const dueAmount = Math.max(0, grandTotal - paidAmount);

    let status: SaleStatus = SaleStatus.PAID;
    if (paidAmount === 0) {
      status = SaleStatus.CREDIT;
    } else if (paidAmount < grandTotal) {
      status = SaleStatus.PARTIALLY_PAID;
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    const sale = await this.prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          customerId: dto.customerId,
          userId: dto.userId,
          invoiceNumber,
          status,
          subTotal,
          discount: orderDiscount,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentType: dto.paymentType,
          notes: dto.notes,
          items: {
            create: computedItems,
          },
        },
        include: { items: true, customer: true },
      });

      for (const item of computedItems) {
        let balanceRecord = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: dto.warehouseId,
              productId: item.productId,
            },
          },
        });

        const newQty = (balanceRecord ? balanceRecord.quantity : 0) - item.quantity;

        if (!balanceRecord) {
          balanceRecord = await tx.stockBalance.create({
            data: {
              tenantId: dto.tenantId,
              warehouseId: dto.warehouseId,
              productId: item.productId,
              quantity: newQty,
            },
          });
        } else {
          await tx.stockBalance.update({
            where: { id: balanceRecord.id },
            data: { quantity: newQty },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: dto.tenantId,
            warehouseId: dto.warehouseId,
            productId: item.productId,
            type: StockMovementType.SALE_OUT,
            quantity: -item.quantity,
            balanceAfter: newQty,
            referenceId: newSale.id,
            notes: `فاتورة مبيعات رقم ${invoiceNumber}`,
            createdById: dto.userId,
          },
        });
      }

      if (dto.customerId && dueAmount > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            balance: {
              increment: dueAmount,
            },
          },
        });

        await tx.customerTransaction.create({
          data: {
            tenantId: dto.tenantId,
            customerId: dto.customerId,
            amount: dueAmount,
            type: 'SALE',
            referenceId: newSale.id,
            notes: `متبقي فاتورة مبيعات رقم ${invoiceNumber}`,
          },
        });
      }

      return newSale;
    });

    return sale;
  }

  async findSales(tenantId: string): Promise<Sale[]> {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
