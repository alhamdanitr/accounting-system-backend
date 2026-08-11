import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  async exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
    this.logger.log(`Exporting data to Excel: ${sheetName}`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
      // Create headers from object keys
      const headers = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key: key,
        width: 20
      }));
      worksheet.columns = headers;

      // Add rows
      data.forEach(item => {
        worksheet.addRow(item);
      });
      
      // Style headers
      worksheet.getRow(1).font = { bold: true };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPdf(data: any[], title: string): Promise<Buffer> {
    this.logger.log(`Exporting data to PDF: ${title}`);
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        
        if (data.length > 0) {
          doc.fontSize(12);
          data.forEach((item, index) => {
            doc.text(`${index + 1}. ${JSON.stringify(item)}`);
            doc.moveDown(0.5);
          });
        } else {
          doc.text('لا توجد بيانات متاحة.', { align: 'center' });
        }

        doc.end();
      } catch (error) {
        this.logger.error(`PDF generation failed: ${error.message}`);
        reject(error);
      }
    });
  }
}
