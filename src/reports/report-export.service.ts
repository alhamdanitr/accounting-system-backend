import { Injectable, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  async exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
    this.logger.log(`Exporting data to Excel (CSV format): ${sheetName}`);
    
    if (!data || data.length === 0) {
      return Buffer.from('No data available');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    const csvContent = [headers, ...rows].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  async exportToPdf(data: any[], title: string): Promise<Buffer> {
    this.logger.log(`Exporting data to PDF text report: ${title}`);
    
    let content = `=== ${title} ===\n\n`;
    if (data && data.length > 0) {
      data.forEach((item, index) => {
        content += `${index + 1}. ${JSON.stringify(item)}\n`;
      });
    } else {
      content += 'لا توجد بيانات متاحة.\n';
    }

    return Buffer.from(content, 'utf-8');
  }
}
