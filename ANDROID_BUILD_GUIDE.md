# AJAY BATTLES — Complete Export, Firebase & Play Store Build Guide

## 1. Local Development & Full-Stack Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in any server-side environment variables you need. Never commit `.env` or signing keystores.
3. Run the full-stack server (Express API + Vite frontend):
   ```bash
   npm run dev
   ```
4. Build production bundle:
   ```bash
   npm run build
   ```

## 2. Firebase Configuration

- **Authentication**: Enable **Email/Password** and **Google** providers in Firebase Console -> Authentication -> Sign-in method.
- **Authorized Domains**: Add your production domain (`localhost` is already included for Capacitor Android WebView).
- **Cloud Firestore**: Deploy `firestore.rules` to your Firestore database (`ai-studio-ajaybattles-7e4da196-6b9f-4ee9-ba95-e781a3668fe4` or your own project's database).
- **Firebase Storage** (optional for custom banner uploads): Configure Firebase Storage in Firebase Console and restrict write rules to authenticated Admin accounts.
- **Security Note**: Never store Admin service-account private keys or signing passwords inside frontend `src/` files or `VITE_*` variables.

## 3. Generate Signing Keystore for Google Play Store

Run once on your computer (Java JDK 17/21 required):

```bash
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias ajaybattles \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Then copy `android/keystore.properties.example` to `android/keystore.properties` and enter your keystore details (`storeFile=release.keystore`, `storePassword=...`, `keyAlias=ajaybattles`, `keyPassword=...`).

## 4. Build Installable APK & Play Store AAB

### Option A: Using Android Studio
1. Sync web assets into Android:
   ```bash
   npm run build && npx cap sync android
   ```
2. Open the `android/` folder in **Android Studio**.
3. Wait for Gradle Sync to finish.
4. Choose **Build -> Generate Signed Bundle / APK...** to produce:
   - **Android App Bundle (`.aab`)** for Google Play Console upload.
   - **APK (`.apk`)** for direct device sideloading.

### Option B: Command Line (Gradle)
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease   # Outputs android/app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # Outputs android/app/build/outputs/bundle/release/app-release.aab
```

### Option C: Automated GitHub Actions
1. Push this exported project to a **public** (or private) GitHub repository.
2. Add optional Play Store signing secrets in **Settings -> Secrets and variables -> Actions**:
   - `ANDROID_KEYSTORE_BASE64` (base64-encoded `.keystore` file)
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. Enable **Settings -> Actions -> General -> Read and write permissions**.
4. Push to `main` or tag `v1.0.0` to automatically generate and publish `ajay-battles.apk` and `ajay-battles.aab` in **GitHub Releases**.
