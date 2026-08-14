import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { AccountingService } from './accounting.service';

const tenantId = '11111111-1111-4111-8111-111111111111';
const accountA = '22222222-2222-4222-8222-222222222222';
const accountB = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

function createPrisma() {
  const tx = {
    journalEntry: { create: jest.fn() },
  };
  return {
    account: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    journalEntry: { findMany: jest.fn() },
    cashbox: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    expense: { findMany: jest.fn(), create: jest.fn() },
    user: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    tx,
  };
}

describe('AccountingService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates an account and validates a parent within the same tenant', async () => {
    const prisma = createPrisma();
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.findFirst.mockResolvedValue({ id: accountA, tenantId });
    prisma.account.create.mockResolvedValue({ id: accountB, tenantId, code: '1100' });
    const service = new AccountingService(prisma as never);

    await expect(service.createAccount({ tenantId, code: '1100', name: 'Cash', type: AccountType.ASSET, parentId: accountA })).resolves.toEqual({
      id: accountB,
      tenantId,
      code: '1100',
    });
    expect(prisma.account.findFirst).toHaveBeenCalledWith({ where: { id: accountA, tenantId } });
    expect(prisma.account.create).toHaveBeenCalled();

    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({ id: accountB, tenantId, code: '1200' });
    await expect(service.createAccount({ tenantId, code: '1200', name: 'Receivables', type: AccountType.ASSET })).resolves.toEqual({
      id: accountB,
      tenantId,
      code: '1200',
    });
  });

  it('rejects duplicate accounts and foreign parents', async () => {
    const duplicatePrisma = createPrisma();
    duplicatePrisma.account.findUnique.mockResolvedValue({ id: accountA });
    const duplicateService = new AccountingService(duplicatePrisma as never);
    await expect(duplicateService.createAccount({ tenantId, code: '1100', name: 'Cash', type: AccountType.ASSET })).rejects.toBeInstanceOf(BadRequestException);

    const foreignParentPrisma = createPrisma();
    foreignParentPrisma.account.findUnique.mockResolvedValue(null);
    foreignParentPrisma.account.findFirst.mockResolvedValue(null);
    const foreignParentService = new AccountingService(foreignParentPrisma as never);
    await expect(foreignParentService.createAccount({ tenantId, code: '1200', name: 'Receivables', type: AccountType.ASSET, parentId: accountA })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists accounts, journal entries, cashboxes and expenses tenant-scoped', async () => {
    const prisma = createPrisma();
    prisma.account.findMany.mockResolvedValue([]);
    prisma.journalEntry.findMany.mockResolvedValue([]);
    prisma.cashbox.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    const service = new AccountingService(prisma as never);

    await expect(service.findAccounts(tenantId)).resolves.toEqual([]);
    await expect(service.findJournalEntries(tenantId)).resolves.toEqual([]);
    await expect(service.findCashboxes(tenantId)).resolves.toEqual([]);
    await expect(service.findExpenses(tenantId)).resolves.toEqual([]);
    expect(prisma.account.findMany).toHaveBeenCalledWith({ where: { tenantId }, orderBy: { code: 'asc' } });
    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId } }));
    expect(prisma.cashbox.findMany).toHaveBeenCalledWith({ where: { tenantId } });
    expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId } }));
  });

  it.each([
    { lines: [], message: 'at least two lines' },
    { lines: [{ accountId: accountA, debit: 100, credit: 0 }], message: 'at least two lines' },
  ])('rejects journal entries with $message', async ({ lines }) => {
    const prisma = createPrisma();
    const service = new AccountingService(prisma as never);
    await expect(service.createJournalEntry({ tenantId, description: 'Entry', lines })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.account.findMany).not.toHaveBeenCalled();
  });

  it('rejects journal entries containing a foreign account', async () => {
    const prisma = createPrisma();
    prisma.account.findMany.mockResolvedValue([{ id: accountA }]);
    const service = new AccountingService(prisma as never);
    await expect(service.createJournalEntry({
      tenantId,
      description: 'Entry',
      lines: [
        { accountId: accountA, debit: 100, credit: 0 },
        { accountId: accountB, debit: 0, credit: 100 },
      ],
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    [{ accountId: accountA, debit: -1, credit: 0 }],
    [{ accountId: accountA, debit: 100, credit: 100 }],
    [{ accountId: accountA, debit: 0, credit: 0 }],
  ])('rejects invalid journal line values', async (line) => {
    const prisma = createPrisma();
    prisma.account.findMany.mockResolvedValue([{ id: accountA }, { id: accountB }]);
    const service = new AccountingService(prisma as never);
    await expect(service.createJournalEntry({ tenantId, description: 'Entry', lines: [line, { accountId: accountB, debit: 0, credit: 1 }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unbalanced journal entries and accepts a balanced transaction', async () => {
    const prisma = createPrisma();
    prisma.account.findMany.mockResolvedValue([{ id: accountA }, { id: accountB }]);
    prisma.tx.journalEntry.create.mockResolvedValue({ id: 'journal-1', tenantId });
    const service = new AccountingService(prisma as never);
    await expect(service.createJournalEntry({
      tenantId,
      description: 'Unbalanced',
      lines: [
        { accountId: accountA, debit: 100, credit: 0 },
        { accountId: accountB, debit: 0, credit: 99 },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);

    jest.spyOn(Date, 'now').mockReturnValue(123456789);
    await expect(service.createJournalEntry({
      tenantId,
      description: 'Balanced',
      reference: 'REF-1',
      sourceType: 'MANUAL',
      userId,
      lines: [
        { accountId: accountA, debit: 100, credit: 0, description: 'Debit' },
        { accountId: accountB, debit: 0, credit: 100, description: 'Credit' },
      ],
    })).resolves.toEqual({ id: 'journal-1', tenantId });
    expect(prisma.tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId, entryNumber: 'JE-23456789', createdById: userId }),
    }));
  });

  it('creates cashboxes and rejects duplicates', async () => {
    const prisma = createPrisma();
    prisma.cashbox.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'cashbox-1' });
    prisma.cashbox.create.mockResolvedValue({ id: 'cashbox-1', tenantId });
    const service = new AccountingService(prisma as never);
    await expect(service.createCashbox({ tenantId, name: 'Main', code: 'MAIN' })).resolves.toEqual({ id: 'cashbox-1', tenantId });
    await expect(service.createCashbox({ tenantId, name: 'Main', code: 'MAIN' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates expenses only for active tenant users', async () => {
    const prisma = createPrisma();
    prisma.user.findFirst.mockResolvedValue({ id: userId, tenantId, status: 'ACTIVE' });
    prisma.expense.create.mockResolvedValue({ id: 'expense-1', tenantId, amount: 25 });
    const service = new AccountingService(prisma as never);
    await expect(service.createExpense({ tenantId, category: 'Transport', amount: 25, userId })).resolves.toEqual({ id: 'expense-1', tenantId, amount: 25 });
    await expect(service.createExpense({ tenantId, category: 'Office', amount: 10 })).resolves.toEqual({ id: 'expense-1', tenantId, amount: 25 });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: userId, tenantId, status: 'ACTIVE' } });
  });

  it('rejects invalid expense amounts and inactive or foreign users', async () => {
    const amountPrisma = createPrisma();
    const amountService = new AccountingService(amountPrisma as never);
    await expect(amountService.createExpense({ tenantId, category: 'Transport', amount: 0 })).rejects.toBeInstanceOf(BadRequestException);

    const userPrisma = createPrisma();
    userPrisma.user.findFirst.mockResolvedValue(null);
    const userService = new AccountingService(userPrisma as never);
    await expect(userService.createExpense({ tenantId, category: 'Transport', amount: 25, userId })).rejects.toBeInstanceOf(NotFoundException);
  });
});
