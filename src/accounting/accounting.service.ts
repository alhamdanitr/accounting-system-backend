import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Account, Cashbox, Expense, JournalEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, CreateCashboxDto, CreateExpenseDto, CreateJournalEntryDto } from './dto/accounting.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const existing = await this.prisma.account.findUnique({
      where: {
        tenantId_code: {
          tenantId: dto.tenantId,
          code: dto.code,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('رقم الحساب موجود مسبقاً في الدليل المحاسبي');
    }

    return this.prisma.account.create({
      data: {
        tenantId: dto.tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
      },
    });
  }

  async findAccounts(tenantId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async createJournalEntry(dto: CreateJournalEntryDto): Promise<JournalEntry> {
    // التحقق من توازن القيد (إجمالي المدين = إجمالي الدائن)
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of dto.lines) {
      totalDebit += line.debit;
      totalCredit += line.credit;
    }

    // السماح بهامش خطأ طفيف جداً للفاصلة العائمة
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `القيد المحاسبي غير متوازن: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit})`,
      );
    }

    const entryNumber = `JE-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId: dto.tenantId,
          entryNumber,
          reference: dto.reference,
          description: dto.description,
          createdById: dto.userId,
          lines: {
            create: dto.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      return entry;
    });
  }

  async findJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
      where: { tenantId },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCashbox(dto: CreateCashboxDto): Promise<Cashbox> {
    return this.prisma.cashbox.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async findCashboxes(tenantId: string): Promise<Cashbox[]> {
    return this.prisma.cashbox.findMany({
      where: { tenantId },
    });
  }

  async createExpense(dto: CreateExpenseDto): Promise<Expense> {
    return this.prisma.expense.create({
      data: {
        tenantId: dto.tenantId,
        category: dto.category,
        amount: dto.amount,
        notes: dto.notes,
        userId: dto.userId,
      },
    });
  }

  async findExpenses(tenantId: string): Promise<Expense[]> {
    return this.prisma.expense.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
