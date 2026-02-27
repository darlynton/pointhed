import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { apiClient } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';

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

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaWidgetId, setCaptchaWidgetId] = useState<string | null>(null);
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
    confirmPassword: '',
    country: 'GB'
  });

  const [phoneCountryCode, setPhoneCountryCode] = useState('GB');

  useEffect(() => {
    if (!turnstileSiteKey || pendingConfirmation) return;

    const renderWidget = () => {
      if (!window.turnstile) return;
      if (captchaWidgetId) return;

      const id = window.turnstile.render('#turnstile-signup', {
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

  }, [turnstileSiteKey, pendingConfirmation]);

  // Countries mapped to supported currencies (NGN, GBP, USD, EUR)
  const countries = [
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', currency: 'GBP', timezone: 'Europe/London' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', currency: 'USD', timezone: 'America/New_York' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', currency: 'NGN', timezone: 'Africa/Lagos' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', currency: 'EUR', timezone: 'Europe/Berlin' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', currency: 'EUR', timezone: 'Europe/Paris' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', currency: 'EUR', timezone: 'Europe/Amsterdam' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', currency: 'EUR', timezone: 'Europe/Madrid' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', currency: 'EUR', timezone: 'Europe/Rome' },
    { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', currency: 'EUR', timezone: 'Europe/Dublin' },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\|<>?,.\/`~]/.test(password);
    
    const missing = [];
    if (!hasLower) missing.push('a lowercase letter');
    if (!hasUpper) missing.push('an uppercase letter');
    if (!hasNumber) missing.push('a number');
    if (!hasSpecial) missing.push('a special character (!@#$%^&*)');
    
    if (missing.length > 0) {
      return `Password needs: ${missing.join(', ')}`;
    }
    
    return null;
  };

  const validateForm = () => {
    // First name
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (formData.firstName.length < 2) {
      setError('First name must be at least 2 characters');
      return false;
    }
    
    // Last name
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (formData.lastName.length < 2) {
      setError('Last name must be at least 2 characters');
      return false;
    }
    
    // Business name
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (formData.businessName.length < 2) {
      setError('Business name must be at least 2 characters');
      return false;
    }
    
    // Email
    if (!formData.contactEmail.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Phone
    if (!formData.contactPhone.trim()) {
      setError('Phone number is required');
      return false;
    }
    const phoneDigits = formData.contactPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      setError('Phone number must be at least 7 digits');
      return false;
    }
    if (phoneDigits.length > 15) {
      setError('Phone number cannot exceed 15 digits');
      return false;
    }
    
    // Country
    if (!formData.country) {
      setError('Country is required');
      return false;
    }
    
    // Password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    if (turnstileSiteKey && !captchaToken) {
      setError('Please complete the verification challenge and try again.');
      setLoading(false);
      return;
    }

    try {
      // 1) Create credentials in Supabase
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const selectedCountry = countries.find(c => c.code === formData.country);
      const dialCode = countries.find(c => c.code === phoneCountryCode)?.dialCode || '+44';
      const profileData = {
        businessName: formData.businessName,
        contactPhone: `${dialCode}${formData.contactPhone}`,
        fullName: fullName,
        country: formData.country || 'GB',
        homeCurrency: selectedCountry?.currency || 'GBP',
        timezone: selectedCountry?.timezone || 'Europe/London'
      };
      
      const { data, error: sErr } = await supabase.auth.signUp({ 
        email: formData.contactEmail, 
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          ...(captchaToken ? { captchaToken } : {}),
          data: profileData // Store in user metadata for retrieval after email confirmation
        }
      });
      
      if (sErr) {
        // Handle specific error cases
        if (sErr.message?.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please login instead.');
        }
        if ((sErr as any)?.status === 429 || sErr.message?.toLowerCase().includes('rate limit')) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again.');
        }
        throw sErr;
      }
      
      // Check if user already exists (Supabase may not throw error in some cases)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      // If email confirmations are enabled in Supabase, a session will NOT be returned
      // until the user confirms their email. In that case, store the pending signup
      // data and show instructions instead of attempting to provision immediately.
      if (!data.session) {
        // Store pending signup data so the callback handler can provision after confirmation
        try {
          localStorage.setItem('pending_signup', JSON.stringify(profileData));
        } catch (e) {
          // ignore localStorage errors
        }
        setPendingConfirmation(true);
        setLoading(false);
        return;
      }
      
      // 2) Clear legacy token so API client uses Supabase session
      apiClient.setToken(null);
      
      // 3) Wait a moment for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4) Provision app resources (tenant + vendor user)
      const provisionResult = await apiClient.provisionVendor({
        businessName: formData.businessName,
        contactPhone: `${dialCode}${formData.contactPhone}`,
        fullName: fullName,
        country: formData.country,
        homeCurrency: selectedCountry?.currency || 'GBP',
        timezone: selectedCountry?.timezone || 'Europe/London'
      });

      // 5) Verify backend accepts the provisioned user by calling /auth/me
      const verifyProfile = await apiClient.getCurrentUser();
      if (!verifyProfile?.user) {
        throw new Error('Provisioning failed. Please try again.');
      }

      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      if (captchaWidgetId && window.turnstile) {
        window.turnstile.reset(captchaWidgetId);
      }
      setCaptchaToken('');
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
              <pattern id="grid-signup" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid-signup)" />
          </svg>
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/">
            <img src="/uploads/logo-white.png" alt="Pointhed" className="h-5 w-auto" />
          </Link>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
              Start your free
              <br />
              30-day trial today
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              No credit card required. Set up in minutes. Start rewarding customers instantly.
            </p>
            
            {/* Features list */}
            <div className="pt-8 border-t border-white/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#98F885] flex items-center justify-center">
                  <span className="text-xs text-[#264EFF] font-bold">✓</span>
                </div>
                <span className="text-white/90">WhatsApp-native loyalty</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#98F885] flex items-center justify-center">
                  <span className="text-xs text-[#264EFF] font-bold">✓</span>
                </div>
                <span className="text-white/90">Unlimited customers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#98F885] flex items-center justify-center">
                  <span className="text-xs text-[#264EFF] font-bold">✓</span>
                </div>
                <span className="text-white/90">Full analytics dashboard</span>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#98F885]/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-10 w-32 h-32 bg-[#FF8BFF]/20 rounded-full blur-2xl" />
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-6 sm:p-8 overflow-y-auto" style={{ backgroundColor: '#f7f7f7ff' }}>
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden mb-6">
          <img src="/uploads/logo.png" alt="Pointhed" className="h-5 w-auto" />
        </Link>
        
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center">
              Create Your Loyalty Program
            </CardTitle>
            <CardDescription className="text-center text-xs sm:text-sm">
              Start your 30-day free trial • No credit card required
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {pendingConfirmation && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>We've sent a confirmation email to <strong>{formData.contactEmail}</strong>.</p>
                      <p className="text-sm">Please check your email and click the confirmation link to complete your signup.</p>
                      <p className="text-xs text-gray-600">💡 Check your spam folder if you don't see it within a few minutes.</p>
                    </div>
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" onClick={() => window.location.href = 'https://mail.google.com'}>
                    Open Gmail
                  </Button>
                  <Button variant="outline" onClick={() => setPendingConfirmation(false)}>
                    Back to Signup
                  </Button>
                </div>
              </div>
            )}

            {!pendingConfirmation && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      disabled={loading}
                      maxLength={50}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    disabled={loading}
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm">Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="you@business.com"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-sm">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={phoneCountryCode}
                      onValueChange={(value) => setPhoneCountryCode(value)}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue>
                          {countries.find(c => c.code === phoneCountryCode)?.flag} {countries.find(c => c.code === phoneCountryCode)?.dialCode}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.dialCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="7911123456"
                      value={formData.contactPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 15) {
                          handleChange('contactPhone', value);
                        }
                      }}
                      disabled={loading}
                      className="flex-1"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-sm">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Business Ltd"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    disabled={loading}
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500">As in legal documents</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm">Country *</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => {
                      handleChange('country', value);
                      setPhoneCountryCode(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    disabled={loading}
                    className="pr-10"
                    maxLength={128}
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
                {formData.password && !validatePassword(formData.password) && (
                  <p className="text-xs text-green-600">✓ Password meets all requirements</p>
                )}
                {formData.password && validatePassword(formData.password) && (
                  <p className="text-xs text-amber-600">{validatePassword(formData.password)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    disabled={loading}
                    className="pr-10"
                    maxLength={128}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              {turnstileSiteKey && (
                <div className="pt-2">
                  <div id="turnstile-signup" className="flex justify-center" />
                  <p className="text-xs text-gray-500 text-center mt-2">Protected by Cloudflare Turnstile</p>
                </div>
              )}
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
