import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto, CreateCashboxDto, CreateExpenseDto, CreateJournalEntryDto } from './dto/accounting.dto';
import { Account, Cashbox, Expense, JournalEntry } from '@prisma/client';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountingService.createAccount(dto);
  }

  @Get('accounts/:tenantId')
  async findAccounts(@Param('tenantId') tenantId: string): Promise<Account[]> {
    return this.accountingService.findAccounts(tenantId);
  }

  @Post('journals')
  async createJournalEntry(@Body() dto: CreateJournalEntryDto): Promise<JournalEntry> {
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journals/:tenantId')
  async findJournalEntries(@Param('tenantId') tenantId: string): Promise<JournalEntry[]> {
    return this.accountingService.findJournalEntries(tenantId);
  }

  @Post('cashboxes')
  async createCashbox(@Body() dto: CreateCashboxDto): Promise<Cashbox> {
    return this.accountingService.createCashbox(dto);
  }

  @Get('cashboxes/:tenantId')
  async findCashboxes(@Param('tenantId') tenantId: string): Promise<Cashbox[]> {
    return this.accountingService.findCashboxes(tenantId);
  }

  @Post('expenses')
  async createExpense(@Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.accountingService.createExpense(dto);
  }

  @Get('expenses/:tenantId')
  async findExpenses(@Param('tenantId') tenantId: string): Promise<Expense[]> {
    return this.accountingService.findExpenses(tenantId);
  }
}
