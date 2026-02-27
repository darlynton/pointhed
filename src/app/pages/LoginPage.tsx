import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { apiClient } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState('');
  const [forgotCaptchaWidgetId, setForgotCaptchaWidgetId] = useState<string | null>(null);
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();

  useEffect(() => {
    if (!turnstileSiteKey || !forgotOpen) return;

    const renderWidget = () => {
      if (!window.turnstile) return;
      if (forgotCaptchaWidgetId) return;

      const id = window.turnstile.render('#turnstile-forgot-password', {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setForgotCaptchaToken(token),
        'expired-callback': () => setForgotCaptchaToken(''),
        'error-callback': () => setForgotCaptchaToken('')
      });

      setForgotCaptchaWidgetId(id);
    };

    const existing = document.querySelector('script[data-turnstile="true"]') as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener('load', renderWidget, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-turnstile', 'true');
    script.addEventListener('load', renderWidget, { once: true });
    document.head.appendChild(script);
  }, [turnstileSiteKey, forgotOpen, forgotCaptchaWidgetId]);

  useEffect(() => {
    if (forgotOpen) return;
    setForgotCaptchaToken('');
    if (forgotCaptchaWidgetId && window.turnstile) {
      window.turnstile.remove(forgotCaptchaWidgetId);
      setForgotCaptchaWidgetId(null);
    }
  }, [forgotOpen, forgotCaptchaWidgetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Map Supabase/backend errors to friendly messages
    const getFriendlyError = (message: string) => {
      const lower = message.toLowerCase();
      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        return 'Incorrect email or password. Please try again.';
      }
      if (lower.includes('email not confirmed')) {
        return 'Please verify your email address before logging in. Check your inbox for the confirmation link.';
      }
      if (lower.includes('user not found')) {
        return 'No account found with this email. Would you like to sign up?';
      }
      return message;
    };
    try {
      // Try Supabase sign-in first (suppress console errors for 400s as they're expected for legacy users)
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Suppress Supabase 400 errors in console - they're expected for legacy users
        const message = args.join(' ');
        if (!message.includes('400') && !message.includes('Bad Request') && !message.includes('grant_type=password')) {
          originalConsoleError(...args);
        }
      };
      
      const { data, error: sErr } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      // Restore console.error
      console.error = originalConsoleError;
      
      // Store remember me preference for session management
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        // Set a flag to maintain longer session
        localStorage.setItem('session_persistent', 'true');
      } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('session_persistent');
      }
      
      if (sErr || !data?.session) {
        // Supabase failed or no session created — fall back to legacy login for migration/testing
        try {
          // Clear any Supabase session before legacy login
          await supabase.auth.signOut();
          const legacy = await apiClient.login(email, password);
          // apiClient.login already sets auth_token if successful
          navigate('/dashboard/overview');
          return;
        } catch (legacyErr: any) {
          // If legacy also fails, surface the most relevant error
            const rawMessage = sErr?.message || legacyErr?.message || 'Incorrect email or password. Please try again.';
          throw new Error(getFriendlyError(rawMessage));
        }
      }

      // Supabase sign-in succeeded and session exists
      // Clear legacy token so API client uses Supabase token
      apiClient.setToken(null);
      // Verify backend accepts the token by calling /auth/me
      // (this ensures the Supabase user is provisioned in the app DB)
      try {
        const profile = await apiClient.getCurrentUser();
        if (!profile?.user) {
          throw new Error('Your account setup is incomplete. Please check your email and click the confirmation link to complete signup.');
        }
        // Success — proceed to dashboard
        navigate('/dashboard/overview');
      } catch (profileErr: any) {
        // Show user-friendly message for provisioning issues
        if (profileErr?.message?.includes('not provisioned') || profileErr?.message?.includes('Account setup incomplete')) {
          // Check if email is verified
          const { data: { user } } = await supabase.auth.getUser();
          if (user && !user.email_confirmed_at) {
            // Email not confirmed - offer to resend
            throw new Error(`📧 Email Verification Required\n\nPlease check your inbox (${email}) for the confirmation link.\n\nDidn't receive it? Check spam or click "Resend Email" below.`);
          }
          // Email is verified but no vendor user - need to complete signup flow
          throw new Error('Your account needs to be set up. Please click the confirmation link from your email, or contact support@pointhed.com for help.');
        }
        throw new Error(profileErr?.message || 'Unable to load your profile. Please try again or contact support.');
      }
    } catch (err: any) {
      const friendlyMessage = getFriendlyError(err.message || 'Something went wrong. Please try again.');
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    
    setLoading(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (resendErr) throw resendErr;
      
      setError('');
      alert('✅ Confirmation email resent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (type: 'coffee' | 'boutique') => {
    if (type === 'coffee') {
      setEmail('joe@coffeehouse.com');
      setPassword('password123');
    } else {
      setEmail('sarah@fashionboutique.com');
      setPassword('password123');
    }
  };

  const handleSendReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    try {
      const targetEmail = (forgotEmail || email).trim();
      if (!targetEmail) throw new Error('Please enter your email.');
      if (turnstileSiteKey && !forgotCaptchaToken) {
        throw new Error('Please complete the verification challenge first.');
      }
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: fErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo,
        ...(forgotCaptchaToken ? { captchaToken: forgotCaptchaToken } : {})
      });
      if (fErr) throw fErr;
      setForgotMessage('Check your inbox for a reset link.');
    } catch (err: any) {
      setForgotError(err.message || 'Could not send reset email.');
    } finally {
      setForgotLoading(false);
      if (forgotCaptchaWidgetId && window.turnstile) {
        window.turnstile.reset(forgotCaptchaWidgetId);
      }
      setForgotCaptchaToken('');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#264EFF]">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/">
            <img src="/uploads/logo-white.png" alt="Pointhed" className="h-5 w-auto" />
          </Link>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
              Bring customers back
              <br />
              through WhatsApp
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              No apps. No cards. Just loyalty that works where your customers already are.
            </p>
            
            {/* Testimonial or stat */}
            <div className="pt-8 border-t border-white/20">
              <p className="text-white/60 text-sm">Trusted by businesses across Africa & Europe</p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#98F885]/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-10 w-32 h-32 bg-[#FF8BFF]/20 rounded-full blur-2xl" />
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-8 sm:p-8" style={{ backgroundColor: '#f7f7f7ff' }}>
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden mb-8">
          <img src="/uploads/logo.png" alt="Pointhed" className="h-5 w-auto" />
        </Link>
        
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-sm">
              Sign in to your vendor account
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center p-1 rounded-md text-gray-600 hover:bg-gray-100"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => {
                  setForgotOpen((s) => !s);
                  setForgotEmail(email);
                  setForgotMessage('');
                  setForgotError('');
                }}
              >
                Forgot password?
              </button>
            </div>

            {forgotOpen && (
                <div className="mt-3 space-y-3 rounded-lg border border-blue-100 bg-white/70 p-3 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-800">Reset your password</p>
                    <p className="text-xs text-gray-500">Enter your email to receive a reset link.</p>
                  </div>

                  {forgotError && (
                    <Alert variant="destructive">
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}
                  {forgotMessage && (
                    <Alert>
                      <AlertDescription>{forgotMessage}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="forgotEmail">Email</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                      />
                    </div>

                    {turnstileSiteKey && (
                      <div className="pt-1">
                        <div id="turnstile-forgot-password" className="flex justify-center" />
                        <p className="text-xs text-gray-500 text-center mt-2">Protected by Cloudflare Turnstile</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={forgotLoading}
                        className="flex-1"
                        onClick={() => handleSendReset()}
                      >
                        {forgotLoading ? 'Sending...' : 'Send reset link'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setForgotOpen(false)}
                        disabled={forgotLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            {error && error.includes('Email Verification Required') && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResendEmail}
                disabled={loading}
              >
                📧 Resend Confirmation Email
              </Button>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              Sign up for free
            </Link>
          </div>

        </CardContent>
      </Card>
      </div>
    </div>
  );
}
