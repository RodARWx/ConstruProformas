import { execFile } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const SOFFICE_CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  'soffice',
  'libreoffice',
].filter(Boolean) as string[];

let cachedSofficePath: string | null | undefined;

export async function isLibreOfficeAvailable(): Promise<boolean> {
  return (await resolveSofficePath()) !== null;
}

async function resolveSofficePath(): Promise<string | null> {
  if (cachedSofficePath !== undefined) {
    return cachedSofficePath;
  }

  for (const candidate of SOFFICE_CANDIDATES) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) {
        cachedSofficePath = candidate;
        return candidate;
      }
      continue;
    }

    try {
      await execFileAsync(candidate, ['--version'], { timeout: 10_000 });
      cachedSofficePath = candidate;
      return candidate;
    } catch {
      // siguiente candidato
    }
  }

  cachedSofficePath = null;
  return null;
}

/** Perfil LibreOffice aislado evita bloqueos en conversiones headless concurrentes */
function buildUserInstallationArg(): string {
  const profileDir = mkdtempSync(join(tmpdir(), 'lo-profile-'));
  const normalized = profileDir.replace(/\\/g, '/');
  return `-env:UserInstallation=file:///${normalized}`;
}

/**
 * Convierte Excel a PDF con LibreOffice headless.
 * Produce un PDF visualmente idéntico al archivo .xlsx.
 */
export async function convertExcelToPdf(
  excelAbsolutePath: string,
  outputDir?: string,
): Promise<string> {
  const soffice = await resolveSofficePath();
  if (!soffice) {
    throw new Error(
      'LibreOffice no está instalado. Instálelo desde https://www.libreoffice.org/ o configure LIBREOFFICE_PATH.',
    );
  }

  const targetDir = outputDir ?? dirname(excelAbsolutePath);
  mkdirSync(targetDir, { recursive: true });

  const userInstall = buildUserInstallationArg();
  const args = [
    userInstall,
    '--headless',
    '--norestore',
    '--nologo',
    '--nofirststartwizard',
    '--convert-to',
    'pdf',
    '--outdir',
    targetDir,
    excelAbsolutePath,
  ];

  try {
    await execFileAsync(soffice, args, {
      timeout: 180_000,
      windowsHide: true,
    });
  } finally {
    const profilePath = userInstall.replace('-env:UserInstallation=file:///', '');
    try {
      rmSync(profilePath.replace(/\//g, '\\'), { recursive: true, force: true });
    } catch {
      // limpieza best-effort
    }
  }

  const pdfPath = join(
    targetDir,
    `${basename(excelAbsolutePath, '.xlsx')}.pdf`,
  );

  if (!existsSync(pdfPath)) {
    throw new Error(
      `LibreOffice no generó el PDF esperado en: ${pdfPath}`,
    );
  }

  return pdfPath;
}

/** Intenta conversión vía Docker si LibreOffice local no está disponible */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync('docker', ['version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export async function convertExcelToPdfViaDocker(
  excelAbsolutePath: string,
  outputDir?: string,
): Promise<string> {
  const targetDir = outputDir ?? dirname(excelAbsolutePath);
  const fileName = basename(excelAbsolutePath);
  const normalizedDir = targetDir.replace(/\\/g, '/');

  await execFileAsync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${normalizedDir}:/exports`,
      'linuxserver/libreoffice:latest',
      'soffice',
      '--headless',
      '--norestore',
      '--convert-to',
      'pdf',
      '--outdir',
      '/exports',
      `/exports/${fileName}`,
    ],
    { timeout: 300_000 },
  );

  const pdfPath = join(targetDir, `${basename(excelAbsolutePath, '.xlsx')}.pdf`);
  if (!existsSync(pdfPath)) {
    throw new Error(`Docker LibreOffice no generó PDF en: ${pdfPath}`);
  }

  return pdfPath;
}
