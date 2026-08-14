import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CompanyService } from './company.service';
import { CreateBranchDto, CreateCompanyDto } from './dto/company.dto';
import { Branch, Company } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthenticatedRequest = Request & { user: { tenantId: string } };

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async createCompany(@Body() dto: CreateCompanyDto): Promise<Company> {
    return this.companyService.createCompany(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('companies.view')
  async findAllCompanies(): Promise<Company[]> {
    return this.companyService.findAllCompanies();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('companies.view')
  async findCompanyById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Company> {
    this.assertTenant(request, id);
    return this.companyService.findCompanyById(id);
  }

  @Post(':tenantId/branches')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('branches.manage')
  async createBranch(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBranchDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Branch> {
    this.assertTenant(request, tenantId);
    return this.companyService.createBranch(tenantId, dto);
  }

  @Get(':tenantId/branches')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('branches.view')
  async findBranchesByTenant(
    @Param('tenantId') tenantId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Branch[]> {
    this.assertTenant(request, tenantId);
    return this.companyService.findBranchesByTenant(tenantId);
  }

  private assertTenant(request: AuthenticatedRequest, tenantId: string) {
    if (request.user.tenantId !== tenantId) {
      throw new ForbiddenException('لا يمكن الوصول إلى شركة أخرى');
    }
  }
}
