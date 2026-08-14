import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'accounting-system-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
