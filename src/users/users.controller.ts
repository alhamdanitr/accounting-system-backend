import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateRoleDto, CreateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { Role, User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(
    @Body() dto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    return this.usersService.createUser(dto);
  }

  @Post('roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  async createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.usersService.createRole(dto);
  }
}
