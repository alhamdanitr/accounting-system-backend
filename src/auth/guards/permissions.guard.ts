import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Fetch user permissions from DB
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!userWithRoles) return false;

    const userPermissions = userWithRoles.roles.flatMap(ur => 
      ur.role.permissions.map(rp => rp.permission.code)
    );

    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
