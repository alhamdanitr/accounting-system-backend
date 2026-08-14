import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { BackupService } from './backup.service';

jest.mock('node:child_process', () => ({ exec: jest.fn() }));

const mockedExec = exec as unknown as jest.Mock;

describe('BackupService', () => {
  let service: BackupService;
  let backupDir: string;

  beforeEach(() => {
    mockedExec.mockReset();
    delete process.env.DATABASE_URL;
    service = new BackupService();
    backupDir = (service as unknown as { backupDir: string }).backupDir;
  });

  afterEach(() => {
    fs.rmSync(backupDir, { recursive: true, force: true });
  });

  it('runs pg_dump and removes backups older than seven days', async () => {
    mockedExec.mockImplementation((_command: string, callback: (error: null, result: object) => void) => {
      callback(null, { stdout: '', stderr: '' });
      return {};
    });
    const oldFile = path.join(backupDir, 'old.sql');
    fs.writeFileSync(oldFile, 'old');
    const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, oldDate / 1000, oldDate / 1000);

    await service.handleDailyBackup();

    expect(mockedExec).toHaveBeenCalledWith(expect.stringContaining('pg_dump'), expect.any(Function));
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  it('logs backup failures without throwing to the scheduler', async () => {
    mockedExec.mockImplementation((_command: string, callback: (error: Error) => void) => {
      callback(new Error('pg_dump failed'));
      return {};
    });

    await expect(service.handleDailyBackup()).resolves.toBeUndefined();
    expect(mockedExec).toHaveBeenCalled();
  });
});
