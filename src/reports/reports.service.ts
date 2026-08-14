import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(tenantId: string) {
    const totalSales = await this.prisma.sale.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, paidAmount: true, dueAmount: true },
      _count: true,
    });

    const totalPurchases = await this.prisma.purchase.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, paidAmount: true, dueAmount: true },
      _count: true,
    });

    const totalCustomers = await this.prisma.customer.count({
      where: { tenantId },
    });

    const totalSuppliers = await this.prisma.supplier.count({
      where: { tenantId },
    });

    const totalProducts = await this.prisma.product.count({
      where: { tenantId, active: true },
    });

    const totalExpenses = await this.prisma.expense.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    });

    return {
      sales: {
        count: totalSales._count,
        totalRevenue: totalSales._sum.grandTotal || 0,
        totalPaid: totalSales._sum.paidAmount || 0,
        totalDue: totalSales._sum.dueAmount || 0,
      },
      purchases: {
        count: totalPurchases._count,
        totalCost: totalPurchases._sum.grandTotal || 0,
        totalPaid: totalPurchases._sum.paidAmount || 0,
        totalDue: totalPurchases._sum.dueAmount || 0,
      },
      expenses: {
        total: totalExpenses._sum.amount || 0,
      },
      entities: {
        customers: totalCustomers,
        suppliers: totalSuppliers,
        products: totalProducts,
      },
    };
  }

  async getSalesReport(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId, status: { not: 'CANCELLED' } };
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const summary = sales.reduce(
      (acc, sale) => {
        acc.totalRevenue += sale.grandTotal;
        acc.totalPaid += sale.paidAmount;
        acc.totalDue += sale.dueAmount;
        acc.totalDiscount += sale.discount;
        return acc;
      },
      { totalRevenue: 0, totalPaid: 0, totalDue: 0, totalDiscount: 0, count: sales.length },
    );

    return { summary, sales };
  }

  async getDailySalesReport(tenantId: string, warehouseId: string, date?: string) {
    const reportDate = date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      throw new BadRequestException('صيغة التاريخ يجب أن تكون YYYY-MM-DD');
    }

    const start = new Date(`${reportDate}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('التاريخ المحدد غير صالح');
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId, active: true },
      select: { id: true, name: true, code: true },
    });
    if (!warehouse) {
      throw new NotFoundException('المستودع غير موجود ضمن الشركة المحددة');
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        warehouseId: warehouse.id,
        status: { not: 'CANCELLED' },
        createdAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        grandTotal: true,
        paidAmount: true,
        dueAmount: true,
        paymentType: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = sales.reduce(
      (acc, sale) => {
        acc.totalRevenue += sale.grandTotal;
        acc.totalPaid += sale.paidAmount;
        acc.totalDue += sale.dueAmount;
        return acc;
      },
      { count: 0, totalRevenue: 0, totalPaid: 0, totalDue: 0 },
    );
    summary.count = sales.length;

    return { date: reportDate, warehouse, summary, sales };
  }

  async getInventoryReport(tenantId: string, warehouseId?: string) {
    const where: any = { tenantId };
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const balances = await this.prisma.stockBalance.findMany({
      where,
      include: { product: true, warehouse: true },
    });

    const lowStockItems = balances.filter(
      (b) => b.quantity <= (b.product.minimumStock || 0),
    );

    return {
      totalItems: balances.length,
      lowStockCount: lowStockItems.length,
      balances,
      lowStockItems,
    };
  }

  async getFinancialSummary(tenantId: string) {
    const salesTotal = await this.prisma.sale.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
    });

    const purchasesTotal = await this.prisma.purchase.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
    });

    const expensesTotal = await this.prisma.expense.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    });

    const revenue = salesTotal._sum.grandTotal || 0;
    const costOfGoods = purchasesTotal._sum.grandTotal || 0;
    const grossProfit = revenue - costOfGoods;
    const totalExpenses = expensesTotal._sum.amount || 0;
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue,
      costOfGoods,
      grossProfit,
      totalExpenses,
      netProfit,
    };
  }
}
