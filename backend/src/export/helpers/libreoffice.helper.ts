import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DEFAULT_WINDOWS_PATHS = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
];

const DEFAULT_LINUX_PATHS = ['/usr/bin/libreoffice', '/usr/bin/soffice'];

export interface LibreOfficeConvertResult {
  pdfPath: string;
  method: 'local' | 'docker';
}

/**
 * Convierte un .xlsx a .pdf usando LibreOffice headless.
 * Prioridad: binario local → contenedor Docker linuxserver/libreoffice.
 */
export async function convertXlsxToPdf(
  xlsxPath: string,
  outputDir?: string,
): Promise<LibreOfficeConvertResult | null> {
  const outDir = outputDir ?? dirname(xlsxPath);
  const localResult = await tryLocalLibreOffice(xlsxPath, outDir);
  if (localResult) {
    return localResult;
  }

  return tryDockerLibreOffice(xlsxPath, outDir);
}

async function tryLocalLibreOffice(
  xlsxPath: string,
  outDir: string,
): Promise<LibreOfficeConvertResult | null> {
  const binary = resolveLibreOfficeBinary();
  if (!binary) {
    return null;
  }

  try {
    await execFileAsync(
      binary,
      [
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        '--outdir',
        outDir,
        xlsxPath,
      ],
      { timeout: 120_000 },
    );

    const pdfPath = join(outDir, `${basename(xlsxPath, '.xlsx')}.pdf`);
    return existsSync(pdfPath) ? { pdfPath, method: 'local' } : null;
  } catch {
    return null;
  }
}

async function tryDockerLibreOffice(
  xlsxPath: string,
  outDir: string,
): Promise<LibreOfficeConvertResult | null> {
  const fileName = basename(xlsxPath);

  try {
    await execFileAsync(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${dirname(xlsxPath)}:/data/in:ro`,
        '-v',
        `${outDir}:/data/out`,
        'linuxserver/libreoffice:latest',
        'soffice',
        '--headless',
        '--nologo',
        '--convert-to',
        'pdf',
        '--outdir',
        '/data/out',
        `/data/in/${fileName}`,
      ],
      { timeout: 180_000 },
    );

    const pdfPath = join(outDir, `${basename(xlsxPath, '.xlsx')}.pdf`);
    return existsSync(pdfPath) ? { pdfPath, method: 'docker' } : null;
  } catch {
    return null;
  }
}

function resolveLibreOfficeBinary(): string | null {
  if (process.env.LIBREOFFICE_PATH && existsSync(process.env.LIBREOFFICE_PATH)) {
    return process.env.LIBREOFFICE_PATH;
  }

  const candidates =
    process.platform === 'win32' ? DEFAULT_WINDOWS_PATHS : DEFAULT_LINUX_PATHS;

  return candidates.find((path) => existsSync(path)) ?? null;
}

export function isLibreOfficeAvailable(): boolean {
  return resolveLibreOfficeBinary() !== null;
}
