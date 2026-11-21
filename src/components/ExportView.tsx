import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileArchive,
  FolderGit2,
  Hammer,
  Package,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  downloadAndroidArtifact,
  downloadSourceCodeZip,
  ExportStatusResponse,
  fetchExportStatus,
  formatBytes,
  triggerAndroidBuild,
} from '../services/exportService';

interface ExportViewProps {
  autoStartZip?: boolean;
  onClearAutoStartZip?: () => void;
  onBack: () => void;
}

type GuideTab = 'android-studio' | 'cli-signing' | 'firebase';

export function ExportView({
  autoStartZip = false,
  onClearAutoStartZip,
  onBack,
}: ExportViewProps) {
  const [status, setStatus] = useState<ExportStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [githubRepo, setGithubRepo] = useState('tufanigamer224-ux/AJAY-BATTELS');

  const [zipDownloading, setZipDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    loaded: number;
    total: number | null;
    percent: number | null;
  } | null>(null);
  const [zipResult, setZipResult] = useState<{
    fileCount: number;
    sizeBytes: number;
  } | null>(null);

  const [buildingAndroid, setBuildingAndroid] = useState(false);
  const [artifactDownloading, setArtifactDownloading] = useState<'apk' | 'aab' | null>(null);
  const [buildLog, setBuildLog] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [guideTab, setGuideTab] = useState<GuideTab>('android-studio');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const loadStatus = useCallback(
    async (repoOverride?: string) => {
      setLoadingStatus(true);
      try {
        const repoToCheck = (repoOverride ?? githubRepo).trim();
        const data = await fetchExportStatus(repoToCheck || undefined);
        setStatus(data);
        if (data.errorDetails && !errorDetails) {
          setErrorDetails(data.errorDetails);
        }
      } catch (err) {
        setErrorDetails(
          err instanceof Error ? err.message : 'Unable to check project export status.'
        );
      } finally {
        setLoadingStatus(false);
      }
    },
    [githubRepo, errorDetails]
  );

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadZip = useCallback(async () => {
    if (zipDownloading) return;
    setZipDownloading(true);
    setErrorDetails(null);
    setStatusNotice(null);
    setZipResult(null);
    setZipProgress({ loaded: 0, total: null, percent: 0 });

    try {
      const result = await downloadSourceCodeZip((loaded, total) => {
        const percent = total && total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
        setZipProgress({ loaded, total, percent });
      });
      setZipResult(result);
      setStatusNotice(
        `Source archive downloaded (${result.fileCount} files, ${formatBytes(result.sizeBytes)}).`
      );
    } catch (err) {
      setErrorDetails(
        err instanceof Error ? err.message : 'Source code ZIP download failed.'
      );
    } finally {
      setZipDownloading(false);
    }
  }, [zipDownloading]);

  useEffect(() => {
    if (autoStartZip) {
      onClearAutoStartZip?.();
      void handleDownloadZip();
    }
  }, [autoStartZip, onClearAutoStartZip, handleDownloadZip]);

  const handleExportProject = async () => {
    setErrorDetails(null);
    setStatusNotice(null);
    setBuildLog(null);
    setBuildingAndroid(true);

    try {
      const refreshed = await fetchExportStatus(githubRepo.trim() || undefined);
      setStatus(refreshed);

      const buildRes = await triggerAndroidBuild();
      if (buildRes.buildLog) {
        setBuildLog(buildRes.buildLog);
      }

      if (buildRes.ok) {
        setStatusNotice('Android APK and AAB build completed and ready for download.');
        await loadStatus();
      } else {
        setErrorDetails(
          buildRes.errorDetails ||
            'Android APK compilation could not run in this environment.'
        );
      }
    } catch (err) {
      setErrorDetails(
        err instanceof Error ? err.message : 'Export verification encountered an error.'
      );
    } finally {
      setBuildingAndroid(false);
    }
  };

  const handleArtifactDownload = async (kind: 'apk' | 'aab') => {
    if (!status) return;
    const artifact = kind === 'apk' ? status.apk : status.aab;
    if (!artifact.available) return;

    setArtifactDownloading(kind);
    setErrorDetails(null);
    setStatusNotice(null);
    try {
      await downloadAndroidArtifact(kind, artifact);
      setStatusNotice(
        `Started download for ${artifact.fileName || `ajay-battles.${kind}`}.`
      );
    } catch (err) {
      setErrorDetails(
        err instanceof Error ? err.message : `Failed to download .${kind} artifact.`
      );
    } finally {
      setArtifactDownloading(null);
    }
  };

  const handleRetryExport = async () => {
    setErrorDetails(null);
    setStatusNotice(null);
    setBuildLog(null);
    await loadStatus();
    await handleDownloadZip();
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(id);
      window.setTimeout(() => setCopiedCmd(null), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const apkReady = Boolean(status?.apk?.available);
  const aabReady = Boolean(status?.aab?.available);

  return (
    <div className="space-y-6">
      {/* Header & Top Action Bar */}
      <section className="glass-card rounded-3xl p-5 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white min-h-[36px] whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF6B1A]" />
              Back to Home
            </button>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-wide text-balance">
              App Export &amp; Play Store Build Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Download the complete AJAY BATTLES source code ZIP (React frontend, Express export API, Firebase rules, Capacitor Android project, and GitHub Actions APK/AAB builder) or download compiled Android binaries when available.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportProject}
              disabled={buildingAndroid || loadingStatus}
              className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <Hammer className="w-4 h-4 text-[#38BDF8]" />
              {buildingAndroid ? 'Checking Build...' : 'EXPORT APP'}
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={zipDownloading}
              className="h-11 px-5 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <FileArchive className="w-4 h-4" />
              {zipDownloading ? 'Packaging ZIP...' : 'DOWNLOAD SOURCE CODE'}
            </button>
          </div>
        </div>

        {/* Real Download Progress Bar */}
        {zipDownloading && zipProgress && (
          <div className="rounded-2xl bg-[#070913]/80 border border-white/10 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Packaging &amp; streaming ZIP archive</span>
              <span className="font-mono-num text-[#38BDF8]">
                {zipProgress.percent !== null
                  ? `${zipProgress.percent}% · ${formatBytes(zipProgress.loaded)} / ${formatBytes(zipProgress.total)}`
                  : formatBytes(zipProgress.loaded)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B1A] to-[#9D4EDD] transition-all duration-150"
                style={{ width: `${zipProgress.percent ?? 65}%` }}
              />
            </div>
          </div>
        )}

        {/* Genuine Success Notice (only shown after actual file verification) */}
        {statusNotice && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}
      </section>

      {/* Primary Download Artifacts Grid */}
      <section aria-label="Downloadable Export Artifacts" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Complete Source Code ZIP */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="font-mono-num text-xs text-emerald-400 font-semibold">
                {status?.projectFilesCount ? `${status.projectFilesCount} files ready` : 'Ready'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Source Code ZIP
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full React + Express + Firebase rules + Capacitor Android project. Excludes local secrets and build caches.
            </p>
            {zipResult && (
              <p className="font-mono-num text-xs text-emerald-300">
                Last archive: {zipResult.fileCount} files · {formatBytes(zipResult.sizeBytes)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={zipDownloading}
            className="w-full h-11 px-4 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {zipDownloading ? 'Downloading ZIP...' : 'Download ZIP'}
          </button>
        </div>

        {/* 2. Android Installable APK */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <span
                className={`font-mono-num text-xs font-semibold ${
                  apkReady ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {apkReady ? 'Available' : 'Not Built Yet'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Android APK
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {apkReady && status?.apk
                ? `${status.apk.fileName} · ${formatBytes(status.apk.sizeBytes)} (${status.apk.source === 'github' ? 'GitHub Release' : 'Local Build'})`
                : 'Compile via Android Studio or GitHub Actions using the exported ZIP to activate direct APK download.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleArtifactDownload('apk')}
            disabled={!apkReady || artifactDownloading === 'apk'}
            className={`w-full h-11 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              apkReady
                ? 'bg-[#38BDF8] hover:bg-[#5ccbfd] text-[#070913]'
                : 'bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            {artifactDownloading === 'apk'
              ? 'Downloading APK...'
              : apkReady
                ? 'Download APK'
                : 'Download APK (Unavailable)'}
          </button>
        </div>

        {/* 3. Google Play Store AAB */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/15 text-[#9D4EDD] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span
                className={`font-mono-num text-xs font-semibold ${
                  aabReady ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {aabReady ? 'Available' : 'Not Built Yet'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Play Store AAB
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {aabReady && status?.aab
                ? `${status.aab.fileName} · ${formatBytes(status.aab.sizeBytes)} (${status.aab.source === 'github' ? 'GitHub Release' : 'Local Build'})`
                : 'Signed Android App Bundle (.aab) required for Google Play Console production publishing.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleArtifactDownload('aab')}
            disabled={!aabReady || artifactDownloading === 'aab'}
            className={`w-full h-11 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              aabReady
                ? 'bg-[#9D4EDD] hover:bg-[#ac64e8] text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            {artifactDownloading === 'aab'
              ? 'Downloading AAB...'
              : aabReady
                ? 'Download AAB'
                : 'Download AAB (Unavailable)'}
          </button>
        </div>
      </section>

      {/* View Build Status & GitHub Release Sync */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-white">
              View Build Status
            </h2>
            <button
              type="button"
              onClick={() => loadStatus()}
              disabled={loadingStatus}
              className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>

          <div className="divide-y divide-white/10 text-xs">
            <StatusRow
              label="Source Package"
              value={
                status?.sourceZipReady
                  ? `Ready (${status.projectFilesCount} files)`
                  : 'Scanning...'
              }
              ok={Boolean(status?.sourceZipReady)}
            />
            <StatusRow
              label="Firebase Project & Rules"
              value={
                status?.firebase.configured
                  ? `${status.firebase.projectId} · Rules ${status.firebase.rulesFilePresent ? 'Included' : 'Missing'}`
                  : 'Not Configured'
              }
              ok={Boolean(status?.firebase.configured && status?.firebase.rulesFilePresent)}
            />
            <StatusRow
              label="Android Gradle Project"
              value={
                status?.androidProjectReady
                  ? `Ready (${status.packageId})`
                  : 'Incomplete'
              }
              ok={Boolean(status?.androidProjectReady)}
            />
            <StatusRow
              label="Host Build Toolchain"
              value={
                status?.toolchain.hasJava && status?.toolchain.hasAndroidSdk
                  ? `JDK & Android SDK Ready (${status.toolchain.nodeVersion})`
                  : `Node ${status?.toolchain.nodeVersion || '—'} · JDK ${status?.toolchain.hasJava ? 'Yes' : 'No'} · Android SDK ${status?.toolchain.hasAndroidSdk ? 'Yes' : 'No'}`
              }
              ok={Boolean(status?.toolchain.hasJava && status?.toolchain.hasAndroidSdk)}
            />
            <StatusRow
              label="Play Store Signing Keystore"
              value={
                status?.toolchain.hasReleaseKeystoreConfigured
                  ? 'Configured'
                  : 'Template Ready (Configure keystore.properties locally)'
              }
              ok={Boolean(status?.toolchain.hasReleaseKeystoreConfigured)}
            />
          </div>

          {/* GitHub Public Release Checker */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <label
              htmlFor="github-repo-input"
              className="block text-xs font-semibold text-slate-300"
            >
              Link Public GitHub Release (Auto-detect built APK &amp; AAB)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <FolderGit2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="github-repo-input"
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#070913]/80 border border-white/10 font-mono-num text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
              <button
                type="button"
                onClick={() => loadStatus(githubRepo)}
                disabled={loadingStatus}
                className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white whitespace-nowrap shrink-0"
              >
                Check GitHub Release
              </button>
            </div>
            {status?.githubRelease?.checked && (
              <p className="text-xs text-slate-400">
                {status.githubRelease.repoExists
                  ? `Release ${status.githubRelease.releaseTag || 'latest'} found on GitHub.`
                  : status.githubRelease.error}
              </p>
            )}
          </div>
        </div>

        {/* Build Error Details & Retry Export */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-white">
                Build Error Details
              </h2>
              <button
                type="button"
                onClick={handleRetryExport}
                disabled={zipDownloading || loadingStatus}
                className="h-10 px-3.5 rounded-xl bg-[#FF6B1A]/15 hover:bg-[#FF6B1A]/25 border border-[#FF6B1A]/35 text-xs font-semibold text-[#FF6B1A] flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Export
              </button>
            </div>

            {errorDetails ? (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2 text-xs text-amber-100 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Native Android Compilation Diagnostic</span>
                </div>
                <p>{errorDetails}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 flex items-start gap-3 text-xs text-emerald-200 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  No export errors detected. Your complete source archive is ready to download and compile in Android Studio or GitHub Actions.
                </span>
              </div>
            )}

            {buildLog && (
              <pre className="rounded-xl bg-[#070913] border border-white/10 p-3 text-[11px] font-mono-num text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {buildLog}
              </pre>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleRetryExport}
              disabled={zipDownloading}
              className="h-11 px-4 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Retry Export
            </button>
            <button
              type="button"
              onClick={handleExportProject}
              disabled={buildingAndroid}
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {buildingAndroid ? 'Checking Toolchain...' : 'Run Android Build Check'}
            </button>
          </div>
        </div>
      </section>

      {/* Instructions: Android Studio, Signed APK/AAB, and Firebase */}
      <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold text-white">
            Play Store &amp; Firebase Build Instructions
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070913]/80 border border-white/10 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'android-studio', label: 'Android Studio' },
                { id: 'cli-signing', label: 'Signed APK & AAB' },
                { id: 'firebase', label: 'Firebase & Env Vars' },
              ] as { id: GuideTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGuideTab(tab.id)}
                className={`h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  guideTab === tab.id
                    ? 'bg-[#FF6B1A] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {guideTab === 'android-studio' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">1. Prepare Extracted Project</p>
              <p>
                Download and unzip <span className="font-mono-num text-[#FF6B1A]">ajay-battles-complete-source.zip</span>, then install packages and sync the web bundle into Android:
              </p>
              <CommandBox
                id="prep"
                command="npm install && npm run build && npx cap sync android"
                copiedId={copiedCmd}
                onCopy={handleCopyText}
              />
            </div>
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">2. Compile in Android Studio</p>
              <p>
                Open the <span className="font-mono-num text-[#38BDF8]">android/</span> directory in Android Studio. Once Gradle sync finishes, select{' '}
                <span className="text-white font-medium">Build &gt; Generate Signed Bundle / APK</span> to export your Play Store <span className="font-mono-num">.aab</span> or sideloadable <span className="font-mono-num">.apk</span>.
              </p>
            </div>
          </div>
        )}

        {guideTab === 'cli-signing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">1. Create Upload Keystore</p>
              <p>
                Generate a signing keystore once, then copy <span className="font-mono-num text-[#38BDF8]">android/keystore.properties.example</span> to <span className="font-mono-num text-[#38BDF8]">android/keystore.properties</span>:
              </p>
              <CommandBox
                id="keystore"
                command="keytool -genkeypair -v -keystore android/app/release.keystore -alias ajaybattles -keyalg RSA -keysize 2048 -validity 10000"
                copiedId={copiedCmd}
                onCopy={handleCopyText}
              />
            </div>
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">2. Build Signed APK &amp; Play Store AAB</p>
              <p>
                Gradle automatically applies your release keystore from <span className="font-mono-num">keystore.properties</span> or CI environment variables:
              </p>
              <CommandBox
                id="gradle"
                command="cd android && ./gradlew assembleRelease bundleRelease"
                copiedId={copiedCmd}
                onCopy={handleCopyText}
              />
            </div>
          </div>
        )}

        {guideTab === 'firebase' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">Firebase Services &amp; Security Rules</p>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                <li>Project ID: <span className="font-mono-num text-[#38BDF8]">{status?.firebase.projectId || 'gen-lang-client-0907530323'}</span></li>
                <li>Firestore DB: <span className="font-mono-num text-white">{status?.firebase.databaseId || 'Configured'}</span></li>
                <li>Security Rules: <span className="font-mono-num text-emerald-300">firestore.rules</span> included in export</li>
                <li>Capacitor WebView origin <span className="font-mono-num">https://localhost</span> works with Firebase Auth</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#070913]/70 border border-white/10 p-4 space-y-2">
              <p className="font-semibold text-white">Environment Variables &amp; Credentials</p>
              <p>
                All private keys (keystore passwords, Gemini API key, signing secrets) stay out of frontend bundles and excluded from source ZIP exports. Copy <span className="font-mono-num text-[#FF6B1A]">.env.example</span> to <span className="font-mono-num text-[#FF6B1A]">.env</span> locally on your server.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-mono-num font-semibold ${
          ok ? 'text-emerald-300' : 'text-amber-300'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CommandBox({
  id,
  command,
  copiedId,
  onCopy,
}: {
  id: string;
  command: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-black/50 border border-white/10 px-3 py-2">
      <code className="font-mono-num text-[11px] text-[#38BDF8] overflow-x-auto no-scrollbar">
        {command}
      </code>
      <button
        type="button"
        onClick={() => onCopy(id, command)}
        aria-label="Copy command"
        className="h-8 px-2.5 rounded-md bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white flex items-center gap-1 shrink-0"
      >
        <Copy className="w-3 h-3" />
        {copiedId === id ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
