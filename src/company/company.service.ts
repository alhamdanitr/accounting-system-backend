import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Branch, Company } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, CreateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.prisma.company.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('شركة بهذا الرمز مسجلة مسبقاً');
    }

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        code: dto.code,
        currencyCode: dto.currencyCode || 'YER',
      },
    });

    // إنشاء الفرع الافتراضي والـ Warehouse الافتراضي للشركة الجديدة
    const defaultBranch = await this.prisma.branch.create({
      data: {
        tenantId: company.id,
        name: 'الفرع الرئيسي',
        code: 'MAIN',
      },
    });

    await this.prisma.warehouse.create({
      data: {
        tenantId: company.id,
        branchId: defaultBranch.id,
        name: 'المستودع الرئيسي',
        code: 'WH-MAIN',
      },
    });

    return company;
  }

  async findAllCompanies(): Promise<Company[]> {
    return this.prisma.company.findMany({
      include: {
        branches: true,
      },
    });
  }

  async findCompanyById(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { branches: true, warehouses: true },
    });
    if (!company) {
      throw new NotFoundException('الشركة غير موجودة');
    }
    return company;
  }

  async createBranch(tenantId: string, dto: CreateBranchDto): Promise<Branch> {
    const company = await this.prisma.company.findUnique({
      where: { id: tenantId },
    });
    if (!company) {
      throw new NotFoundException('الشركة غير موجودة');
    }

    const existing = await this.prisma.branch.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: dto.code,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('فرع بهذا الرمز مسجل مسبقاً لنفس الشركة');
    }

    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
      },
    });

    // إنشاء مستودع افتراضي للفرع الجديد
    await this.prisma.warehouse.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `مستودع ${dto.name}`,
        code: `WH-${dto.code}`,
      },
    });

    return branch;
  }

  async findBranchesByTenant(tenantId: string): Promise<Branch[]> {
    return this.prisma.branch.findMany({
      where: { tenantId },
    });
  }
}
