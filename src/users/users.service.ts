import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const existing = await this.prisma.role.findFirst({
      where: { tenantId: dto.tenantId, name: الدور(dto.name) },
    });
    if (existing) {
      throw new BadRequestException('الدور موجود مسبقاً في هذه الشركة');
    }

    return this.prisma.role.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
      },
    });
  }
}

function الدور(name: string): string {
  return name;
}
