import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  deviceId?: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'default_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { company: true, branch: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('المستخدم غير مصرح له أو تم تعليق حسابه');
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      email: user.email,
      deviceId: payload.deviceId,
    };
  }
}
