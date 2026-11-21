import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

interface ArchiverInstance {
  pipe: (dest: NodeJS.WritableStream) => void;
  file: (filePath: string, data: { name: string }) => void;
  finalize: () => Promise<void>;
  on: (event: 'error', listener: (err: Error) => void) => void;
}
type ArchiverFactory = (
  format: 'zip',
  options?: { zlib?: { level?: number } }
) => ArchiverInstance;

const require = createRequire(import.meta.url);
const archiver = require('archiver') as ArchiverFactory;

dotenv.config();

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(process.cwd());
const PORT = Number(process.env.PORT || 3000);

interface FirebaseConfigFile {
  projectId?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

function readFirebaseConfig(): FirebaseConfigFile {
  try {
    const configPath = path.resolve(ROOT_DIR, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseConfigFile;
    }
  } catch {
    // Ignore parse error; fallback to env
  }
  return {};
}

const firebaseConfig = readFirebaseConfig();
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId || '';

// Cache Google public X.509 certs for Firebase ID token verification
let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase auth public keys (${resp.status})`);
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = {
    certs,
    expiresAt: Date.now() + Math.max(60, maxAgeSec) * 1000,
  };
  return certs;
}

function decodeBase64Url(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; email?: string }> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID is not configured on the server.');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token signature algorithm.');
  }

  const certs = await getFirebasePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unrecognized token signing key.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const validSig = verifier.verify(cert, decodeBase64Url(encodedSignature));
  if (!validSig) {
    throw new Error('Invalid token signature.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Token issuer mismatch.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Authentication token expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Token issued-at time is invalid.');
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token subject is missing.');
  }

  return { uid: payload.sub, email: payload.email };
}

async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please sign in first.' });
      return;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Empty authentication token.' });
      return;
    }
    const verified = await verifyFirebaseIdToken(token);
    res.locals.authUser = verified;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid or expired authentication session.',
    });
  }
}

const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-apk',
  'build',
  'coverage',
  '.gradle',
  '.idea',
  '.cxx',
  'capacitor-cordova-android-plugins',
]);

const EXCLUDED_FILE_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'keystore.properties',
  'local.properties',
  'DRAFT_firestore.rules',
  '.DS_Store',
]);

const EXCLUDED_EXTENSIONS = new Set(['.jks', '.keystore', '.log', '.apk', '.aab']);

function isExcludedPath(relPosixPath: string, name: string, isDir: boolean): boolean {
  if (isDir) {
    if (EXCLUDED_DIR_NAMES.has(name)) return true;
    if (relPosixPath === 'android/app/build' || relPosixPath === 'android/build') return true;
    if (relPosixPath === 'android/app/src/main/assets/public') return true;
    return false;
  }
  if (EXCLUDED_FILE_NAMES.has(name)) return true;
  if (name.startsWith('.env.') && name !== '.env.example') return true;
  const ext = path.extname(name).toLowerCase();
  if (EXCLUDED_EXTENSIONS.has(ext)) return true;
  return false;
}

async function collectExportFiles(
  currentDir: string,
  relBase = ''
): Promise<{ absPath: string; relPath: string }[]> {
  const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
  const results: { absPath: string; relPath: string }[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absPath = path.resolve(currentDir, entry.name);
    if (!absPath.startsWith(ROOT_DIR + path.sep)) continue;

    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (isExcludedPath(relPath, entry.name, entry.isDirectory())) continue;

    if (entry.isDirectory()) {
      const nested = await collectExportFiles(absPath, relPath);
      results.push(...nested);
    } else if (entry.isFile()) {
      results.push({ absPath, relPath });
    }
  }
  return results;
}

async function checkCommandExists(cmd: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: ROOT_DIR,
      timeout: 5000,
    });
    return { ok: true, output: (stdout || stderr || '').trim().split('\n')[0] || '' };
  } catch {
    return { ok: false, output: '' };
  }
}

function findLocalArtifact(kind: 'apk' | 'aab'): {
  found: boolean;
  absPath?: string;
  fileName?: string;
  sizeBytes?: number;
  signed?: boolean;
} {
  const candidates =
    kind === 'apk'
      ? [
          { rel: 'dist-apk/ajay-battles.apk', signed: true },
          { rel: 'android/app/build/outputs/apk/release/app-release.apk', signed: true },
          { rel: 'android/app/build/outputs/apk/debug/app-debug.apk', signed: true },
          { rel: 'android/app/build/outputs/apk/release/app-release-unsigned.apk', signed: false },
        ]
      : [
          { rel: 'dist-apk/ajay-battles.aab', signed: true },
          { rel: 'android/app/build/outputs/bundle/release/app-release.aab', signed: true },
        ];

  for (const candidate of candidates) {
    const absPath = path.resolve(ROOT_DIR, candidate.rel);
    if (!absPath.startsWith(ROOT_DIR + path.sep)) continue;
    if (fs.existsSync(absPath)) {
      const stat = fs.statSync(absPath);
      if (stat.isFile() && stat.size > 0) {
        return {
          found: true,
          absPath,
          fileName: path.basename(absPath),
          sizeBytes: stat.size,
          signed: candidate.signed,
        };
      }
    }
  }
  return { found: false };
}

interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

async function checkGitHubReleaseArtifacts(repoSlug: string): Promise<{
  checked: boolean;
  repoExists: boolean;
  releaseTag?: string;
  apk?: { fileName: string; sizeBytes: number; downloadUrl: string };
  aab?: { fileName: string; sizeBytes: number; downloadUrl: string };
  error?: string;
}> {
  if (!/^[A-Za-z0-9_.-]{1,64}\/[A-Za-z0-9_.-]{1,64}$/.test(repoSlug)) {
    return { checked: false, repoExists: false, error: 'Repository must be in owner/repo format.' };
  }
  try {
    const resp = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ajay-battles-export-checker',
      },
    });
    if (resp.status === 404) {
      return {
        checked: true,
        repoExists: false,
        error: 'No published GitHub Release found yet (or repository is private).',
      };
    }
    if (!resp.ok) {
      return {
        checked: true,
        repoExists: false,
        error: `GitHub API returned HTTP ${resp.status}.`,
      };
    }
    const data = (await resp.json()) as {
      tag_name?: string;
      assets?: GitHubReleaseAsset[];
    };
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const apkAsset = assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
    const aabAsset = assets.find((a) => a.name.toLowerCase().endsWith('.aab'));

    const isSafeGithubDownload = (url: string) =>
      url.startsWith('https://github.com/') || url.startsWith('https://objects.githubusercontent.com/');

    return {
      checked: true,
      repoExists: true,
      releaseTag: data.tag_name,
      apk:
        apkAsset && isSafeGithubDownload(apkAsset.browser_download_url)
          ? {
              fileName: apkAsset.name,
              sizeBytes: apkAsset.size,
              downloadUrl: apkAsset.browser_download_url,
            }
          : undefined,
      aab:
        aabAsset && isSafeGithubDownload(aabAsset.browser_download_url)
          ? {
              fileName: aabAsset.name,
              sizeBytes: aabAsset.size,
              downloadUrl: aabAsset.browser_download_url,
            }
          : undefined,
    };
  } catch (err) {
    return {
      checked: true,
      repoExists: false,
      error: err instanceof Error ? err.message : 'Unable to reach GitHub Releases API.',
    };
  }
}

async function getToolchainDiagnostics() {
  const [javaCheck, gradleExists, capacitorConfigExists, keystorePropsExists] = await Promise.all([
    checkCommandExists('java', ['-version']),
    Promise.resolve(fs.existsSync(path.resolve(ROOT_DIR, 'android/gradlew'))),
    Promise.resolve(fs.existsSync(path.resolve(ROOT_DIR, 'capacitor.config.ts'))),
    Promise.resolve(fs.existsSync(path.resolve(ROOT_DIR, 'android/keystore.properties'))),
  ]);

  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
  const hasAndroidSdk = Boolean(androidHome && fs.existsSync(androidHome));

  return {
    nodeVersion: process.version,
    hasJava: javaCheck.ok,
    javaVersion: javaCheck.output || null,
    hasAndroidSdk,
    hasGradleWrapper: gradleExists,
    hasCapacitorConfig: capacitorConfigExists,
    hasReleaseKeystoreConfigured:
      keystorePropsExists || Boolean(process.env.ANDROID_KEYSTORE_PATH),
  };
}

let activeAndroidBuild = false;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Inspect genuine export, Firebase, Android Studio & APK/AAB readiness
  app.get('/api/export/status', requireFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const files = await collectExportFiles(ROOT_DIR);
      const toolchain = await getToolchainDiagnostics();
      const localApk = findLocalArtifact('apk');
      const localAab = findLocalArtifact('aab');

      const githubRepoParam =
        typeof req.query.githubRepo === 'string' ? req.query.githubRepo.trim() : '';
      const githubRelease = githubRepoParam
        ? await checkGitHubReleaseArtifacts(githubRepoParam)
        : null;

      const apkAvailable = localApk.found || Boolean(githubRelease?.apk);
      const aabAvailable = localAab.found || Boolean(githubRelease?.aab);

      let buildStatus: 'ready' | 'toolchain_missing' | 'building' = 'ready';
      let errorDetails: string | null = null;

      if (activeAndroidBuild) {
        buildStatus = 'building';
      } else if (!apkAvailable && (!toolchain.hasJava || !toolchain.hasAndroidSdk)) {
        buildStatus = 'toolchain_missing';
        const missing: string[] = [];
        if (!toolchain.hasJava) missing.push('Java JDK 21');
        if (!toolchain.hasAndroidSdk) missing.push('Android SDK (ANDROID_HOME)');
        errorDetails = `Direct cloud APK/AAB compilation is unavailable here because ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not installed in this Node.js runtime. Download the complete source ZIP to compile in Android Studio or build automatically via the included GitHub Actions workflow.`;
      }

      res.json({
        appName: 'AJAY BATTLES',
        packageId: 'com.ajaybattles.app',
        sourceZipReady: files.length > 0,
        projectFilesCount: files.length,
        firebase: {
          configured: Boolean(FIREBASE_PROJECT_ID),
          projectId: FIREBASE_PROJECT_ID || null,
          databaseId: firebaseConfig.firestoreDatabaseId || null,
          storageBucket: firebaseConfig.storageBucket || null,
          rulesFilePresent: fs.existsSync(path.resolve(ROOT_DIR, 'firestore.rules')),
        },
        androidProjectReady:
          toolchain.hasGradleWrapper &&
          toolchain.hasCapacitorConfig &&
          fs.existsSync(path.resolve(ROOT_DIR, 'android/app/build.gradle')),
        toolchain,
        apk: localApk.found
          ? {
              available: true,
              source: 'local',
              fileName: localApk.fileName,
              sizeBytes: localApk.sizeBytes,
              signed: localApk.signed,
              downloadUrl: '/api/export/artifact/apk',
            }
          : githubRelease?.apk
            ? {
                available: true,
                source: 'github',
                fileName: githubRelease.apk.fileName,
                sizeBytes: githubRelease.apk.sizeBytes,
                signed: true,
                downloadUrl: githubRelease.apk.downloadUrl,
                releaseTag: githubRelease.releaseTag,
              }
            : { available: false, source: null },
        aab: localAab.found
          ? {
              available: true,
              source: 'local',
              fileName: localAab.fileName,
              sizeBytes: localAab.sizeBytes,
              downloadUrl: '/api/export/artifact/aab',
            }
          : githubRelease?.aab
            ? {
                available: true,
                source: 'github',
                fileName: githubRelease.aab.fileName,
                sizeBytes: githubRelease.aab.sizeBytes,
                downloadUrl: githubRelease.aab.downloadUrl,
                releaseTag: githubRelease.releaseTag,
              }
            : { available: false, source: null },
        githubRelease,
        buildStatus,
        errorDetails,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to inspect export readiness.',
      });
    }
  });

  // Stream a real complete ZIP archive of the project (excluding secrets & build caches)
  app.get('/api/export/source-zip', requireFirebaseAuth, async (_req: Request, res: Response) => {
    const tempZipPath = path.join(os.tmpdir(), `ajay-battles-export-${crypto.randomUUID()}.zip`);

    try {
      const files = await collectExportFiles(ROOT_DIR);
      if (files.length === 0) {
        res.status(500).json({ error: 'No source files were found to export.' });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(tempZipPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        output.on('close', () => resolve());
        output.on('error', (err: Error) => reject(err));
        archive.on('error', (err: Error) => reject(err));

        archive.pipe(output);
        for (const file of files) {
          archive.file(file.absPath, { name: `ajay-battles/${file.relPath}` });
        }
        void archive.finalize();
      });

      const stat = await fs.promises.stat(tempZipPath);
      if (!stat.isFile() || stat.size === 0) {
        throw new Error('Generated ZIP archive is empty.');
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ajay-battles-complete-source.zip"'
      );
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('X-Export-File-Count', String(files.length));

      const readStream = fs.createReadStream(tempZipPath);
      const cleanup = () => {
        fs.promises.unlink(tempZipPath).catch(() => {});
      };
      res.on('finish', cleanup);
      res.on('close', cleanup);
      readStream.on('error', (streamErr) => {
        cleanup();
        if (!res.headersSent) {
          res.status(500).json({ error: streamErr.message });
        }
      });
      readStream.pipe(res);
    } catch (err) {
      fs.promises.unlink(tempZipPath).catch(() => {});
      if (!res.headersSent) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Failed to build source ZIP archive.',
        });
      }
    }
  });

  // Attempt real Android APK/AAB build if host toolchain exists; report exact errors otherwise
  app.post('/api/export/build-android', requireFirebaseAuth, async (_req: Request, res: Response) => {
    if (activeAndroidBuild) {
      res.status(409).json({
        ok: false,
        status: 'building',
        errorDetails: 'An Android build is already running on the server.',
      });
      return;
    }

    const toolchain = await getToolchainDiagnostics();
    if (!toolchain.hasJava || !toolchain.hasAndroidSdk || !toolchain.hasGradleWrapper) {
      const missing: string[] = [];
      if (!toolchain.hasJava) missing.push('Java JDK 21 (java binary missing)');
      if (!toolchain.hasAndroidSdk) missing.push('Android SDK (ANDROID_HOME / ANDROID_SDK_ROOT unset)');
      if (!toolchain.hasGradleWrapper) missing.push('android/gradlew wrapper');

      res.status(422).json({
        ok: false,
        status: 'toolchain_missing',
        errorDetails: `Cannot compile native APK/AAB inside this runtime. Missing requirements: ${missing.join('; ')}. Use "Download Source Code (ZIP)" to compile in Android Studio, or push the exported repository to GitHub to run the included Android APK & AAB workflow.`,
        toolchain,
      });
      return;
    }

    activeAndroidBuild = true;
    try {
      const androidDir = path.resolve(ROOT_DIR, 'android');
      const gradlewPath = path.resolve(androidDir, 'gradlew');

      await execFileAsync('npm', ['run', 'build'], { cwd: ROOT_DIR, timeout: 120000 });
      await execFileAsync('npx', ['cap', 'sync', 'android'], { cwd: ROOT_DIR, timeout: 120000 });

      const tasks = toolchain.hasReleaseKeystoreConfigured
        ? ['assembleRelease', 'bundleRelease']
        : ['assembleDebug', 'bundleRelease'];

      const { stdout, stderr } = await execFileAsync(gradlewPath, tasks, {
        cwd: androidDir,
        timeout: 300000,
      });

      const localApk = findLocalArtifact('apk');
      const localAab = findLocalArtifact('aab');

      res.json({
        ok: localApk.found || localAab.found,
        status: localApk.found ? 'ready' : 'failed',
        apk: localApk.found
          ? {
              available: true,
              fileName: localApk.fileName,
              sizeBytes: localApk.sizeBytes,
              downloadUrl: '/api/export/artifact/apk',
            }
          : { available: false },
        aab: localAab.found
          ? {
              available: true,
              fileName: localAab.fileName,
              sizeBytes: localAab.sizeBytes,
              downloadUrl: '/api/export/artifact/aab',
            }
          : { available: false },
        buildLog: `${stdout}\n${stderr}`.trim().slice(-4000),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Android Gradle compilation failed.';
      res.status(500).json({
        ok: false,
        status: 'failed',
        errorDetails: message,
      });
    } finally {
      activeAndroidBuild = false;
    }
  });

  // Download locally compiled APK or AAB when genuinely present on disk
  app.get('/api/export/artifact/:kind', requireFirebaseAuth, async (req: Request, res: Response) => {
    const kind = req.params.kind;
    if (kind !== 'apk' && kind !== 'aab') {
      res.status(400).json({ error: 'Invalid artifact type requested.' });
      return;
    }

    const artifact = findLocalArtifact(kind);
    if (!artifact.found || !artifact.absPath || !artifact.fileName) {
      res.status(404).json({
        error: `No compiled .${kind} file was found on the server yet.`,
      });
      return;
    }

    res.setHeader(
      'Content-Type',
      kind === 'apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ajay-battles.${kind}"`
    );
    if (artifact.sizeBytes) {
      res.setHeader('Content-Length', String(artifact.sizeBytes));
    }

    fs.createReadStream(artifact.absPath).pipe(res);
  });

  // Frontend serving (Vite dev middleware or static dist in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AJAY BATTLES server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
