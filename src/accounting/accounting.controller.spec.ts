import { ForbiddenException } from '@nestjs/common';
import { AccountingController } from './accounting.controller';

describe('AccountingController', () => {
  const tenantId = 'tenant-1';
  const request = { user: { tenantId } } as any;
  const otherRequest = { user: { tenantId: 'tenant-2' } } as any;
  const service = {
    createAccount: jest.fn().mockResolvedValue({ id: 'account-1' }),
    findAccounts: jest.fn().mockResolvedValue([]),
    createJournalEntry: jest.fn().mockResolvedValue({ id: 'journal-1' }),
    findJournalEntries: jest.fn().mockResolvedValue([]),
    createCashbox: jest.fn().mockResolvedValue({ id: 'cashbox-1' }),
    findCashboxes: jest.fn().mockResolvedValue([]),
    createExpense: jest.fn().mockResolvedValue({ id: 'expense-1' }),
    findExpenses: jest.fn().mockResolvedValue([]),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delegates all accounting endpoints with tenant context', async () => {
    const controller = new AccountingController(service as never);
    const dto = { tenantId, name: 'test' } as any;
    await expect(controller.createAccount(dto, request)).resolves.toEqual({ id: 'account-1' });
    await expect(controller.findAccounts(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createJournalEntry(dto, request)).resolves.toEqual({ id: 'journal-1' });
    await expect(controller.findJournalEntries(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createCashbox(dto, request)).resolves.toEqual({ id: 'cashbox-1' });
    await expect(controller.findCashboxes(tenantId, request)).resolves.toEqual([]);
    await expect(controller.createExpense(dto, request)).resolves.toEqual({ id: 'expense-1' });
    await expect(controller.findExpenses(tenantId, request)).resolves.toEqual([]);
    expect(service.createAccount).toHaveBeenCalledWith(dto);
    expect(service.findAccounts).toHaveBeenCalledWith(tenantId);
    expect(service.createJournalEntry).toHaveBeenCalledWith(dto);
    expect(service.findJournalEntries).toHaveBeenCalledWith(tenantId);
    expect(service.createCashbox).toHaveBeenCalledWith(dto);
    expect(service.findCashboxes).toHaveBeenCalledWith(tenantId);
    expect(service.createExpense).toHaveBeenCalledWith(dto);
    expect(service.findExpenses).toHaveBeenCalledWith(tenantId);
  });

  it('rejects every endpoint when session tenant differs from requested tenant', async () => {
    const controller = new AccountingController(service as never);
    const dto = { tenantId } as any;
    await expect(controller.createAccount(dto, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findAccounts(tenantId, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createJournalEntry(dto, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findJournalEntries(tenantId, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createCashbox(dto, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findCashboxes(tenantId, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.createExpense(dto, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.findExpenses(tenantId, otherRequest)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.createAccount).not.toHaveBeenCalled();
  });

  it('rejects missing session identity', async () => {
    const controller = new AccountingController(service as never);
    await expect(controller.findAccounts(tenantId, { user: undefined } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
