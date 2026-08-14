import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
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
    const user = await this.usersService.findByEmailOrPhone(dto.tenantId, dto.identifier);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('الحساب غير نشط');

    let device = await this.prisma.device.findFirst({ where: { tenantId: dto.tenantId, deviceKeyHash: dto.deviceKeyHash } });
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
      device = await this.prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), userId: user.id, status: DeviceStatus.ACTIVE } });
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user, device);
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true, device: true } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) throw new UnauthorizedException('جلسة التحديث غير صالحة أو منتهية');
    if (stored.user.tenantId !== dto.tenantId || stored.user.status !== 'ACTIVE') throw new UnauthorizedException('جلسة التحديث لا تنتمي إلى الشركة أو الحساب النشط');
    if (dto.deviceId && stored.deviceId !== dto.deviceId) throw new UnauthorizedException('جلسة التحديث لا تنتمي إلى الجهاز المحدد');
    if (stored.device && stored.device.status !== DeviceStatus.ACTIVE) throw new UnauthorizedException('الجهاز غير نشط');

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const device = stored.device ?? await this.prisma.device.findFirst({ where: { tenantId: dto.tenantId, userId: stored.user.id, status: DeviceStatus.ACTIVE } });
    if (!device) throw new UnauthorizedException('الجهاز غير موجود أو غير نشط');
    return this.issueTokens(stored.user, device);
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (stored && stored.user.tenantId === dto.tenantId && !stored.revokedAt) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    }
    return { success: true };
  }

  private async issueTokens(user: { id: string; tenantId: string; email: string | null; fullName: string; branchId: string | null }, device: { id: string; name: string; platform: string }) {
    const accessToken = this.jwtService.sign({ sub: user.id, tenantId: user.tenantId, deviceId: device.id, email: user.email });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      device: { id: device.id, name: device.name, platform: device.platform },
      user: { id: user.id, fullName: user.fullName, email: user.email, tenantId: user.tenantId, branchId: user.branchId },
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
