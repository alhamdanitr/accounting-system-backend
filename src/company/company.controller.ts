import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateBranchDto, CreateCompanyDto } from './dto/company.dto';
import { Branch, Company } from '@prisma/client';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async createCompany(@Body() dto: CreateCompanyDto): Promise<Company> {
    return this.companyService.createCompany(dto);
  }

  @Get()
  async findAllCompanies(): Promise<Company[]> {
    return this.companyService.findAllCompanies();
  }

  @Get(':id')
  async findCompanyById(@Param('id') id: string): Promise<Company> {
    return this.companyService.findCompanyById(id);
  }

  @Post(':tenantId/branches')
  async createBranch(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateBranchDto,
  ): Promise<Branch> {
    return this.companyService.createBranch(tenantId, dto);
  }

  @Get(':tenantId/branches')
  async findBranchesByTenant(
    @Param('tenantId') tenantId: string,
  ): Promise<Branch[]> {
    return this.companyService.findBranchesByTenant(tenantId);
  }
}
