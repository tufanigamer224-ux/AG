import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail, Phone, ShieldCheck, User as UserIcon, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BRAND_ASSETS, VALIDATION_PATTERNS, validateSignUpFields } from '../lib/validation';

type AuthMode = 'login' | 'signup' | 'forgot';

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : 'Authentication failed.';
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Use Google Sign-In below or enable Email/Password under Authentication > Sign-in method.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completion.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return msg;
}

export function AuthView() {
  const {
    signUpWithEmail,
    loginWithEmail,
    loginWithGoogle,
    sendResetEmail,
    needsProfileCompletion,
    completeGoogleProfile,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gameName, setGameName] = useState('');
  const [freeFireUid, setFreeFireUid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!VALIDATION_PATTERNS.email.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const validationErr = validateSignUpFields({
      mobileNumber,
      email,
      gameName,
      freeFireUid,
      password,
      confirmPassword,
    });
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({
        mobileNumber,
        email,
        gameName,
        freeFireUid,
        password,
      });
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!VALIDATION_PATTERNS.email.test(email.trim())) {
      setError('Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await sendResetEmail(email);
      setSuccess('Password reset instructions sent to your email.');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!VALIDATION_PATTERNS.mobileNumber.test(mobileNumber.trim())) {
      setError('Enter a valid 8–20 digit mobile number.');
      return;
    }
    if (gameName.trim().length < 2 || gameName.trim().length > 40) {
      setError('Game Name must be 2–40 characters.');
      return;
    }
    if (!VALIDATION_PATTERNS.freeFireUid.test(freeFireUid.trim())) {
      setError('Free Fire UID must be 5–20 numeric digits.');
      return;
    }
    setLoading(true);
    try {
      await completeGoogleProfile({ mobileNumber, gameName, freeFireUid });
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (needsProfileCompletion) {
    return (
      <div className="min-h-screen bg-[#070913] flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card w-full max-w-md rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_ASSETS.logo}
              alt="AJAY BATTLES"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-white/10"
            />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide text-white">
                Complete Player Profile
              </h1>
              <p className="text-xs text-slate-400">
                Required once for tournament slot verification
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleCompleteGoogleProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Free Fire Game Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Your In-Game Name"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Free Fire UID
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={freeFireUid}
                  onChange={(e) => setFreeFireUid(e.target.value)}
                  placeholder="e.g. 2489104432"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm font-mono-num text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7e38] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
            >
              {loading ? 'Saving Profile...' : 'Enter AJAY BATTLES'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Use a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] grid lg:grid-cols-2">
      {/* Left Cinematic Arena Showcase (Desktop) */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-white/10">
        <img
          src={BRAND_ASSETS.heroBanner}
          alt="AJAY BATTLES Esports Arena"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-[#070913]/65 to-[#070913]/70" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src={BRAND_ASSETS.logo}
            alt="AJAY BATTLES"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border border-white/15"
          />
          <span className="font-display text-2xl font-bold tracking-wider text-white">
            AJAY BATTLES
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-4">
          <h2 className="font-display text-5xl font-extrabold leading-tight text-white">
            PLAY LIKE A PRO. WIN LIKE A CHAMPION.
          </h2>
          <p className="text-base text-slate-300 leading-relaxed">
            Compete in verified daily Solo, Duo, Squad, and Clash Squad 1v1 Free Fire tournaments with instant Room Pass access and secure wallet payouts.
          </p>
          <div className="pt-4 flex items-center gap-6 text-xs text-slate-300">
            <span>Verified Room Passes</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Brackets</span>
            <span aria-hidden="true">·</span>
            <span>Separated Prize Wallet</span>
          </div>
        </div>
      </div>

      {/* Right Auth Form */}
      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <img
              src={BRAND_ASSETS.logo}
              alt="AJAY BATTLES"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-cover border border-white/15"
            />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wider text-white">
                AJAY BATTLES
              </h1>
              <p className="text-xs text-slate-400">Free Fire Esports Platform</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Mode Switcher */}
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#070913]/80 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`h-10 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-[#FF6B1A] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`h-10 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    mode === 'signup'
                      ? 'bg-[#FF6B1A] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-white">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-400">
                  Enter your account email to receive a password reset link.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300 leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300 leading-relaxed">
                {success}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs font-medium text-[#38BDF8] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7e38] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                >
                  {loading ? 'Signing In...' : 'Login'}
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Game Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="In-Game Name"
                        className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Free Fire UID
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={freeFireUid}
                        onChange={(e) => setFreeFireUid(e.target.value)}
                        placeholder="2489104432"
                        className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#070913]/80 border border-white/10 text-sm font-mono-num text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7e38] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7e38] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                >
                  {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full h-10 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Back to Login
                </button>
              </form>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="px-3 text-xs text-slate-500">or</span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.31 0 3.25 2.69 1.28 6.61l3.66 2.84C5.8 6.86 8.64 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-2 3.72-4.94 3.72-8.69z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M4.94 14.55A7.19 7.19 0 0 1 4.55 12c0-.89.16-1.74.39-2.55L1.28 6.61A11.98 11.98 0 0 0 0 12c0 1.93.46 3.75 1.28 5.39l3.66-2.84z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.08.72-2.45 1.16-4.23 1.16-3.36 0-6.2-1.86-7.06-4.83l-3.66 2.84C3.25 21.31 7.31 24 12 24z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
