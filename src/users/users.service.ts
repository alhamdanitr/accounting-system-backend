import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, CreateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.tenantId },
    });
    if (!company) {
      throw new NotFoundException('الشركة غير موجودة');
    }

    const existingUserCount = await this.prisma.user.count({ where: { tenantId: dto.tenantId } });
    if (existingUserCount > 0) {
      throw new ForbiddenException('إنشاء المستخدم الأول فقط متاح عبر التسجيل الأولي؛ يجب أن ينشئ المستخدمون اللاحقون من مسؤول مصادق عليه');
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId: dto.tenantId, active: true },
      });
      if (!branch) {
        throw new NotFoundException('الفرع غير موجود أو لا يتبع الشركة المحددة');
      }
    }

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { tenantId: dto.tenantId, email: dto.email },
      });
      if (existing) {
        throw new BadRequestException('البريد الإلكتروني مستخدم مسبقاً في هذه الشركة');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: dto.tenantId,
        branchId: dto.branchId,
        email: dto.email,
        phone: dto.phone,
        fullName: dto.fullName,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findByEmailOrPhone(tenantId: string, identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { company: true, branch: true, roles: { include: { role: true } } },
    });
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const company = await this.prisma.company.findUnique({ where: { id: dto.tenantId } });
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const existing = await this.prisma.role.findFirst({
      where: { tenantId: dto.tenantId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('الدور موجود مسبقاً في هذه الشركة');
    }

    const permissionCodes = [...new Set(dto.permissionCodes ?? [])];
    const permissions = permissionCodes.length
      ? await this.prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
      : [];
    if (permissions.length !== permissionCodes.length) {
      const found = new Set(permissions.map((permission) => permission.code));
      const missing = permissionCodes.filter((code) => !found.has(code));
      throw new BadRequestException(`صلاحيات غير معروفة: ${missing.join(', ')}`);
    }

    return this.prisma.role.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }
}

