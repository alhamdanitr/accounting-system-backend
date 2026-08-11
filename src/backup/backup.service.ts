import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Daily backup handler (triggered by scheduler or cron)
  async handleDailyBackup() {
    this.logger.log('Starting daily database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);
    
    const dbUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/accounting_db';
    
    try {
      const command = `pg_dump "${dbUrl}" -F c -f "${backupFile}"`;
      await execAsync(command);
      
      this.logger.log(`Database backup completed successfully: ${backupFile}`);
      await this.cleanupOldBackups();
    } catch (error) {
      this.logger.error(`Failed to create database backup: ${error.message}`);
    }
  }

  private async cleanupOldBackups() {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > sevenDaysInMs) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted old backup file: ${file}`);
      }
    });
  }
}
