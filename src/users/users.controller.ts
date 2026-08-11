import { Body, Controller, Post } from '@nestjs/common';
import { CreateRoleDto, CreateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { Role, User } from '@prisma/client';

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
  async createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.usersService.createRole(dto);
  }
}
