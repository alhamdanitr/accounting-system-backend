import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/auth.dto';
import { DeviceStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailOrPhone(
      dto.tenantId,
      dto.identifier,
    );
    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('الحساب غير نشط');
    }

    // تسجيل أو تحديث الجهاز المستخدم للمزامنة
    let device = await this.prisma.device.findFirst({
      where: {
        tenantId: dto.tenantId,
        deviceKeyHash: dto.deviceKeyHash,
      },
    });

    if (!device) {
      device = await this.prisma.device.create({
        data: {
          tenantId: dto.tenantId,
          branchId: user.branchId,
          userId: user.id,
          name: dto.deviceName,
          platform: dto.devicePlatform,
          deviceKeyHash: dto.deviceKeyHash,
          status: DeviceStatus.ACTIVE,
          lastSeenAt: new Date(),
        },
      });
    } else {
      device = await this.prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          userId: user.id,
          status: DeviceStatus.ACTIVE,
        },
      });
    }

    // إصدار JWT Access Token
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      deviceId: device.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // تحديث تاريخ آخر تسجيل دخول
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      device: {
        id: device.id,
        name: device.name,
        platform: device.platform,
      },
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
    };
  }
}
