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

    if (dto.parentId) {
      const parent = await this.prisma.account.findFirst({ where: { id: dto.parentId, tenantId: dto.tenantId } });
      if (!parent) throw new NotFoundException('الحساب الأب غير موجود ضمن الشركة المحددة');
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
    if (dto.lines.length < 2) {
      throw new BadRequestException('القيد المحاسبي يجب أن يحتوي على سطرين على الأقل');
    }

    const accountIds = [...new Set(dto.lines.map((line) => line.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, tenantId: dto.tenantId },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new NotFoundException('يوجد حساب غير موجود ضمن الشركة المحددة');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of dto.lines) {
      if (line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
        throw new BadRequestException('كل سطر محاسبي يجب أن يحتوي على مدين أو دائن موجب، وليس كليهما');
      }
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
    const existing = await this.prisma.cashbox.findUnique({ where: { tenantId_code: { tenantId: dto.tenantId, code: dto.code } } });
    if (existing) throw new BadRequestException('رمز الصندوق موجود مسبقاً في الشركة');

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
    if (dto.amount <= 0) throw new BadRequestException('قيمة المصروف يجب أن تكون أكبر من صفر');
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId: dto.tenantId, status: 'ACTIVE' } });
      if (!user) throw new NotFoundException('المستخدم غير موجود أو غير نشط ضمن الشركة المحددة');
    }

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
