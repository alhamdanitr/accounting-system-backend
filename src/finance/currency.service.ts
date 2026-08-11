import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExchangeRateDto {
  tenantId: string;
  currencyCode: string;
  exchangeRate: number;
  userId: string;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private prisma: PrismaService) {}

  async updateExchangeRate(dto: ExchangeRateDto) {
    this.logger.log(`Updating exchange rate for ${dto.currencyCode} to ${dto.exchangeRate} by user ${dto.userId}`);
    
    // In production, this would update a Currency or ExchangeRate table in the database
    // await this.prisma.exchangeRate.upsert({ ... });
    
    return {
      success: true,
      message: `Exchange rate for ${dto.currencyCode} updated to ${dto.exchangeRate}`
    };
  }

  async convertAmount(amount: number, fromCurrency: string, toCurrency: string, tenantId: string): Promise<number> {
    this.logger.log(`Converting ${amount} from ${fromCurrency} to ${toCurrency}`);
    
    // Example static conversion for demonstration
    const rates: Record<string, number> = {
      'USD': 1.0,
      'YER': 530.0, // Example rate
      'SAR': 3.75
    };

    const amountInUSD = amount / (rates[fromCurrency] || 1);
    const finalAmount = amountInUSD * (rates[toCurrency] || 1);

    return Math.round(finalAmount * 100) / 100;
  }
}
