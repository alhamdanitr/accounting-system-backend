import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VoucherDto {
  tenantId: string;
  type: 'RECEIPT' | 'PAYMENT';
  amount: number;
  currencyCode: string;
  referenceId?: string;
  notes: string;
  userId: string;
  accountId: string; // Customer, Supplier, or Expense Account ID
  cashboxId: string; // The cashbox receiving or paying the money
}

export interface ExpenseDto {
  tenantId: string;
  amount: number;
  currencyCode: string;
  expenseCategoryId: string;
  cashboxId: string;
  notes: string;
  userId: string;
}

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(private prisma: PrismaService) {}

  async processVoucher(dto: VoucherDto) {
    this.logger.log(`Processing ${dto.type} voucher for amount ${dto.amount} ${dto.currencyCode}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Cashbox Balance
      const cashbox = await tx.cashbox.findUnique({ where: { id: dto.cashboxId } });
      if (!cashbox) throw new BadRequestException('Cashbox not found');

      const newCashBalance = dto.type === 'RECEIPT' 
        ? cashbox.balance + dto.amount 
        : cashbox.balance - dto.amount;

      if (newCashBalance < 0 && dto.type === 'PAYMENT') {
        throw new BadRequestException('Insufficient funds in cashbox for payment');
      }

      await tx.cashbox.update({
        where: { id: dto.cashboxId },
        data: { balance: newCashBalance }
      });

      // 2. Determine if account is Customer or Supplier and update balance
      // Note: In a real system, we'd check account type first. Assuming Customer for RECEIPT and Supplier for PAYMENT for this example logic.
      if (dto.type === 'RECEIPT') {
        const customer = await tx.customer.findUnique({ where: { id: dto.accountId } });
        if (customer) {
          await tx.customer.update({
            where: { id: dto.accountId },
            data: { balance: customer.balance - dto.amount } // Receipt reduces customer debt
          });
          
          await tx.customerTransaction.create({
            data: {
              tenantId: dto.tenantId,
              customerId: dto.accountId,
              amount: -dto.amount,
              type: 'RECEIPT_VOUCHER',
              notes: dto.notes
            }
          });
        }
      } else if (dto.type === 'PAYMENT') {
        const supplier = await tx.supplier.findUnique({ where: { id: dto.accountId } });
        if (supplier) {
          await tx.supplier.update({
            where: { id: dto.accountId },
            data: { balance: supplier.balance - dto.amount } // Payment reduces our debt to supplier
          });

          await tx.supplierTransaction.create({
            data: {
              tenantId: dto.tenantId,
              supplierId: dto.accountId,
              amount: -dto.amount,
              type: 'PAYMENT_VOUCHER',
              notes: dto.notes
            }
          });
        }
      }

      return { success: true, message: `${dto.type} voucher processed successfully` };
    });
  }

  async processExpense(dto: ExpenseDto) {
    this.logger.log(`Processing Expense: ${dto.amount} ${dto.currencyCode} for category ${dto.expenseCategoryId}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct from Cashbox
      const cashbox = await tx.cashbox.findUnique({ where: { id: dto.cashboxId } });
      if (!cashbox || cashbox.balance < dto.amount) {
        throw new BadRequestException('Insufficient funds in cashbox for expense');
      }

      await tx.cashbox.update({
        where: { id: dto.cashboxId },
        data: { balance: cashbox.balance - dto.amount }
      });

      // 2. Record Expense
      const expense = await tx.expense.create({
        data: {
          tenantId: dto.tenantId,
          category: { connect: { id: dto.expenseCategoryId } },
          amount: dto.amount,
          notes: dto.notes,
          userId: dto.userId,
          cashboxId: dto.cashboxId
        }
      });

      return { success: true, expenseId: expense.id, message: 'Expense recorded successfully' };
    });
  }
}
