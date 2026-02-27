import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaWidgetId, setCaptchaWidgetId] = useState<string | null>(null);
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();

  // Check if user arrived via magic link
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey || success) return;

    const renderWidget = () => {
      if (!window.turnstile) return;
      if (captchaWidgetId) return;

      const id = window.turnstile.render('#turnstile-reset-password', {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken('')
      });
      setCaptchaWidgetId(id);
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
  }, [turnstileSiteKey, success, captchaWidgetId]);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\|<>?,.\\/`~]/.test(pwd);
    
    const missing = [];
    if (!hasLower) missing.push('a lowercase letter');
    if (!hasUpper) missing.push('an uppercase letter');
    if (!hasNumber) missing.push('a number');
    if (!hasSpecial) missing.push('a special character (!@#$%^&*)');;
    
    if (missing.length > 0) {
      return `Password needs: ${missing.join(', ')}`;;
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate passwords
      const passwordError = validatePassword(password);
      if (passwordError) {
        throw new Error(passwordError);
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (turnstileSiteKey && !captchaToken) {
        throw new Error('Please complete the verification challenge first.');
      }

      // Update password via Supabase
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
      if (captchaWidgetId && window.turnstile) {
        window.turnstile.reset(captchaWidgetId);
      }
      setCaptchaToken('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <Alert>
                <AlertDescription className="text-green-700">
                  ✓ Password reset successful! Redirecting to login...
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {password && !validatePassword(password) && (
                  <p className="text-xs text-green-600">✓ Password meets all requirements</p>
                )}
                {password && validatePassword(password) && (
                  <p className="text-xs text-amber-600">{validatePassword(password)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute inset-y-0 right-2 flex items-center p-1 rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {turnstileSiteKey && (
                <div className="pt-1">
                  <div id="turnstile-reset-password" className="flex justify-center" />
                  <p className="text-xs text-gray-500 text-center mt-2">Protected by Cloudflare Turnstile</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => navigate('/login')}
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
