import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AccountingService } from './accounting.service';
import {
  CreateAccountDto,
  CreateCashboxDto,
  CreateExpenseDto,
  CreateJournalEntryDto,
} from './dto/accounting.dto';
import { Account, Cashbox, Expense, JournalEntry } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & {
  user: {
    tenantId: string;
  };
};

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('accounts')
  @Permissions('accounting.manage')
  async createAccount(
    @Body() dto: CreateAccountDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Account> {
    this.assertTenant(request, dto.tenantId);
    return this.accountingService.createAccount(dto);
  }

  @Get('accounts/:tenantId')
  @Permissions('accounting.view')
  async findAccounts(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Account[]> {
    this.assertTenant(request, tenantId);
    return this.accountingService.findAccounts(tenantId);
  }

  @Post('journals')
  @Permissions('accounting.manage')
  async createJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<JournalEntry> {
    this.assertTenant(request, dto.tenantId);
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journals/:tenantId')
  @Permissions('accounting.view')
  async findJournalEntries(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<JournalEntry[]> {
    this.assertTenant(request, tenantId);
    return this.accountingService.findJournalEntries(tenantId);
  }

  @Post('cashboxes')
  @Permissions('accounting.manage')
  async createCashbox(
    @Body() dto: CreateCashboxDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Cashbox> {
    this.assertTenant(request, dto.tenantId);
    return this.accountingService.createCashbox(dto);
  }

  @Get('cashboxes/:tenantId')
  @Permissions('accounting.view')
  async findCashboxes(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Cashbox[]> {
    this.assertTenant(request, tenantId);
    return this.accountingService.findCashboxes(tenantId);
  }

  @Post('expenses')
  @Permissions('accounting.manage')
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Expense> {
    this.assertTenant(request, dto.tenantId);
    return this.accountingService.createExpense(dto);
  }

  @Get('expenses/:tenantId')
  @Permissions('accounting.view')
  async findExpenses(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Expense[]> {
    this.assertTenant(request, tenantId);
    return this.accountingService.findExpenses(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (!request.user || request.user.tenantId !== tenantId) {
      throw new ForbiddenException('الشركة المطلوبة غير متطابقة مع جلسة المستخدم');
    }
  }
}
