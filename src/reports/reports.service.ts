import { Injectable } from '@nestjs/common';
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
