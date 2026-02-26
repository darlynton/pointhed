import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Mail, MessageCircle, CheckCircle2, Gift, TrendingUp, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import LogoText from './logo-text.svg';
import HeroImage from './hero-image.jpg';
import HeroMock from './mock.jpg';


export function WaitlistLanding() {
  // Animated Hero State - Typing Effect
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const phrases = [
    'how to fix it',
    'how to find them',
    'how to keep them'
  ];

  // ROI Calculator State
  const [monthlyCustomers, setMonthlyCustomers] = useState(500);
  const [avgOrderValue, setAvgOrderValue] = useState(85);
  const [purchaseFrequency, setPurchaseFrequency] = useState(3.5);
  const [engagementRate, setEngagementRate] = useState(35); // % of customers who actively engage
  const [showGlow, setShowGlow] = useState(false);
  const [currency, setCurrency] = useState('USD'); // Default currency

  // Dual CTA State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+44'); // Default to UK
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [ctaMode, setCtaMode] = useState<'instant' | 'email'>('email');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  

  // Common country codes for the dropdown
  const countryCodes = [
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+1', country: 'US', flag: '🇺🇸' },
    { code: '+1', country: 'CA', flag: '🇨🇦' },
    { code: '+49', country: 'DE', flag: '🇩🇪' },
    { code: '+33', country: 'FR', flag: '🇫🇷' },
    { code: '+39', country: 'IT', flag: '🇮🇹' },
    { code: '+34', country: 'ES', flag: '🇪🇸' },
    { code: '+31', country: 'NL', flag: '🇳🇱' },
    { code: '+61', country: 'AU', flag: '🇦🇺' },
    { code: '+234', country: 'NG', flag: '🇳🇬' },
  ];

  // Major currencies for calculator with realistic ranges
  const currencies = [
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', min: 100, max: 100000, step: 500, defaultAOV: 25000 },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', min: 15, max: 400, step: 5, defaultAOV: 65 },
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', min: 20, max: 500, step: 5, defaultAOV: 85 },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', min: 20, max: 500, step: 5, defaultAOV: 75 },
  ];

  // Format currency with proper internationalization
  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      // Fallback if currency is not supported
      const currencyData = currencies.find(c => c.code === currency);
      const symbol = currencyData?.symbol || currency;
      return `${symbol}${amount.toLocaleString()}`;
    }
  };

  // Get current currency configuration
  const getCurrentCurrencyConfig = () => {
    return currencies.find(c => c.code === currency) || currencies[0];
  };

  // Adjust AOV when currency changes to maintain realistic values
  useEffect(() => {
    const currencyConfig = getCurrentCurrencyConfig();
    // If current AOV is outside the new currency's range, set to default
    if (avgOrderValue < currencyConfig.min || avgOrderValue > currencyConfig.max) {
      setAvgOrderValue(currencyConfig.defaultAOV);
    }
  }, [currency]);

  // Calculate ROI with realistic, segmented approach
  const engagementRateDecimal = engagementRate / 100;
  
  // Conservative, defensible lift percentages
  const frequencyLift = 0.12; // 12% frequency increase for engaged customers
  const aovLift = 0.10; // 10% AOV increase for engaged customers
  
  // Base revenue (all customers, current behavior)
  const currentRevenue = monthlyCustomers * avgOrderValue * purchaseFrequency * 12;
  
  // Engaged customers see the lift
  const engagedCustomers = monthlyCustomers * engagementRateDecimal;
  const engagedRevenue = engagedCustomers * 
                         (avgOrderValue * (1 + aovLift)) * 
                         (purchaseFrequency * (1 + frequencyLift)) * 12;
  
  // Non-engaged customers maintain baseline
  const nonEngagedCustomers = monthlyCustomers * (1 - engagementRateDecimal);
  const nonEngagedRevenue = nonEngagedCustomers * avgOrderValue * purchaseFrequency * 12;
  
  // Total projected revenue
  const projectedRevenue = engagedRevenue + nonEngagedRevenue;
  const annualLift = projectedRevenue - currentRevenue;
  
  // Calculate effective lift percentage
  const liftPercentage = ((projectedRevenue / currentRevenue - 1) * 100).toFixed(1);

  // Trigger glow effect on value change
  useEffect(() => {
    setShowGlow(true);
    const timer = setTimeout(() => setShowGlow(false), 600);
    return () => clearTimeout(timer);
  }, [monthlyCustomers, avgOrderValue, purchaseFrequency, currency, engagementRate]);

  // Typing and backspace effect for hero
  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = 100; // ms per character
    const deletingSpeed = 50; // ms per character when deleting
    const pauseAfterTyping = 2000; // pause when fully typed
    const pauseAfterDeleting = 500; // pause when fully deleted

    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText.length < currentPhrase.length) {
      // Typing forward
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.slice(0, displayText.length + 1));
      }, typingSpeed);
    } else if (!isDeleting && displayText.length === currentPhrase.length) {
      // Pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseAfterTyping);
    } else if (isDeleting && displayText.length > 0) {
      // Deleting backward
      timeout = setTimeout(() => {
        setDisplayText(currentPhrase.slice(0, displayText.length - 1));
      }, deletingSpeed);
    } else if (isDeleting && displayText.length === 0) {
      // Move to next phrase after deletion
      timeout = setTimeout(() => {
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, pauseAfterDeleting);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = ctaMode === 'instant' ? phoneNumber : email;
    if (!value) return;

    if (ctaMode === 'instant') {
      // Use shared sender so UI can also trigger resend
      setErrorMessage(null); // Clear any previous errors
      setSuccessMessage(null); // Clear any previous success
      setInfoMessage(null); // Clear any previous info
      try {
        const data = await sendInstant(phoneNumber, countryCode);
        if (data) {
          const positionText = data.position ? ` You are number ${data.position} on the waitlist!` : '';
          setSuccessMessage(`WhatsApp message sent successfully to ${countryCode}${phoneNumber.replace(/^0/, '')}.${positionText} Check your phone!`);
        }
      } catch (error) {
        console.error('Failed to send WhatsApp:', error);
        const rawMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's already requested
        if (rawMessage === 'ALREADY_REQUESTED') {
          setInfoMessage(`Demo already sent to ${countryCode}${phoneNumber.replace(/^0/, '')}. Check your WhatsApp!`);
        } else {
          setErrorMessage(getFriendlyErrorMessage(rawMessage));
        }
      }
    } else {
      // email waitlist flow
      setErrorMessage(null);
      setSuccessMessage(null);
      setInfoMessage(null);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api/v1';
        const res = await fetch(`${API_BASE}/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'landing_page' })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to join waitlist' }));
          console.error('❌ Waitlist join failed:', data);
          throw new Error(data.error || 'Failed to join waitlist');
        }

        const data = await res.json();
        console.log('✅ Waitlist response:', data);

        if (!data.success) {
          throw new Error(data.error || 'Failed to join waitlist');
        }

        if (data.alreadyExists) {
          setInfoMessage(`You're already on our waitlist! We'll contact you at ${email} soon.`);
        } else {
          const positionText = data.position ? ` You are number ${data.position} on the waitlist!` : '';
          setSuccessMessage(`Successfully joined the waitlist!${positionText} We'll contact you at ${email} within 48 hours.`);
        }
      } catch (error) {
        console.error('Failed to join waitlist:', error);
        const rawMessage = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(rawMessage.includes('email') ? rawMessage : 'Failed to join waitlist. Please try again.');
      }
    }
  };

  // Convert technical error messages to user-friendly ones
  const getFriendlyErrorMessage = (error: string): string => {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('not in allowed list') || lowerError.includes('not allowed')) {
      return 'This phone number is not verified for demo messages. Please use a different number or contact support.';
    }
    if (lowerError.includes('invalid phone') || lowerError.includes('invalid number')) {
      return 'This phone number format is invalid. Please check and try again.';
    }
    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (lowerError.includes('not configured') || lowerError.includes('credentials')) {
      return 'WhatsApp messaging is temporarily unavailable. Please try again later.';
    }
    
    // Default user-friendly message
    return 'Unable to send message. Please verify your phone number and try again.';
  };

  // Helper to send instant (used by submit + resend)
  const sendInstant = async (phone: string, country: string) => {
    setIsSending(true);
    try {
      // Clean and format the phone number
      let cleanPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
      
      // Remove leading zero or plus if present
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      // Combine country code with cleaned phone number
      const formattedPhone = country + cleanPhone;

      console.log('📱 Sending WhatsApp to:', formattedPhone);
      
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api/v1';
      const res = await fetch(`${API_BASE}/whatsapp/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to send message' }));
        console.error('❌ WhatsApp send failed:', data);
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }
      
      const data = await res.json();
      console.log('📱 WhatsApp API response:', data);
      
      if (!data.success) {
        console.error('❌ WhatsApp API returned error:', data);
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }

      // Check if already requested
      if (data.alreadyRequested) {
        console.log('ℹ️  Demo already sent to this number');
        throw new Error('ALREADY_REQUESTED');
      }
      
      console.log('✅ WhatsApp sent successfully', data);
      return data; // Return full data including position
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber) return;
    setErrorMessage(null); // Clear any previous errors
    setSuccessMessage(null); // Clear any previous success
    try {
      const data = await sendInstant(phoneNumber, countryCode);
      const positionText = data?.position ? ` You are number ${data.position} on the waitlist!` : '';
      setSuccessMessage(`WhatsApp message resent to ${countryCode}${phoneNumber.replace(/^0/, '')}.${positionText} Check your phone!`);
    } catch (error) {
      console.error('Failed to resend WhatsApp:', error);
      const rawMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(getFriendlyErrorMessage(rawMessage));
    }
  };

  

  return (
    <div className="waitlist-scope min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Ambient background gradient */}
      <div className="fixed inset-0 pointer-events-none" />
      
      {/* Grain texture overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
      }} />

      <div className="relative">
        {/* Header */}
        <header className="backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-2">
              <img src={LogoText} alt="Pointhed" className="h-6" />
            </div>
            <div className="flex items-center gap-6">
              {/* <a
              href="#rewards"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('rewards');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              >
              Rewards
              </a> */}

              <a
              href="#calculator"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // Prefer an element with id "calculator" if present, otherwise find the section by visible heading text
                let el = document.getElementById('calculator') as HTMLElement | null;
                if (!el) {
                el = Array.from(document.querySelectorAll('section')).find(s =>
                  (s.textContent || '').includes('Revenue Impact Calculator')
                ) as HTMLElement | null;
                }
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              >
              Revenue Calculator
              </a>

              
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-10 max-w-7xl">
          <div className="space-y-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 mx-auto">
              <div className="size-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-gray-700 tracking-wide">
                NOW ACCEPTING EARLY ACCESS
              </span>
            </div>

            <h1 className="mx-auto text-3xl sm:text-4xl md:text-5xl hero-title font-regular tracking-tight leading-tight max-w-5xl text-gray-600">
              You're losing customers.
              <br />
              <span className="text-gray-900 text-left">
                Pointhed knows{' '}
                <span className="inline-block min-w-[8em] text-left">
                  {displayText}
                  <span className="animate-pulse">|</span>
                </span>
              </span>
            </h1>

            <p
              className="text-lg text-gray-600 max-w-4xl mx-auto -mt-4"
              style={{
              fontFamily: "'Host Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              whiteSpace: 'normal',
              overflow: 'visible',
              textOverflow: 'clip',
              }}
            >
              Make every interaction drive repeat business.
              <br />
              WhatsApp-delivered offers and timely nudges that increase lifetime value.
            </p>

            <div className="pt-1">
                <div className="space-y-4">
                    <>
                      <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-gray-200 bg-gray-50 mx-auto pointer-events-auto relative z-20">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCtaMode('email'); }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            ctaMode === 'email' 
                              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Mail className="size-4" />
                          Join Waitlist
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCtaMode('instant'); }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                ctaMode === 'instant' 
                                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' 
                                  : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <MessageCircle className="size-4" />
                          Instant Experience
                        </button>
                      </div>

                    <p className="text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
                      {ctaMode === 'instant' ? (
                        <>
                          Upon entry, our system initiates a WhatsApp handshake. 
                          You'll receive a message template within 8 seconds. This is the actual system.
                        </>
                      ) : (
                        <>
                          Request early access to Pointhed. We'll email you access credentials and onboarding materials within 48 hours.
                        </>
                      )}
                    </p>

                    {errorMessage && (
                      <div className="max-w-lg mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setErrorMessage(null)}
                            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {successMessage && (
                      <div className="max-w-lg mx-auto mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">{successMessage}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSuccessMessage(null)}
                            className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {infoMessage && (
                      <div className="max-w-lg mx-auto mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800">{infoMessage}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInfoMessage(null)}
                            className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    <form id="hero-waitlist-form" onSubmit={handleSubmit} className="flex gap-3 max-w-lg mx-auto justify-center">
                      {ctaMode === 'instant' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="appearance-none leading-none bg-white border border-gray-200 text-gray-900 text-sm h-12 px-3 pr-8 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjMTExODI3IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[right_0.75rem_center] bg-no-repeat"
                          >
                            {countryCodes.map((country, index) => (
                              <option key={index} value={country.code}>
                                {country.flag} {country.code} {country.country}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => { setPhoneNumber(e.target.value); setErrorMessage(null); setSuccessMessage(null); setInfoMessage(null); }}
                            placeholder="7404 938 935"
                            required
                            pattern="[0-9\s\-\(\)]{7,12}"
                            title="Enter a valid phone number (7-12 digits)"
                            minLength={7}
                            maxLength={12}
                            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 font-mono text-sm h-12 flex-1"
                          />
                        </div>
                      ) : (
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); setSuccessMessage(null); setInfoMessage(null); }}
                          placeholder="enterprise@domain.com"
                          required
                          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 font-mono text-sm h-12"
                        />
                      )}
                      <Button
                        type="submit"
                        className="bg-[var(--primary)] text-[var(--primary-foreground)] h-12 px-8 font-medium tracking-tight whitespace-nowrap"
                      >
                        {isSending ? 'Sending...' : (ctaMode === 'instant' ? 'Experience Now' : 'Request Access')}
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </form>
                  </>

              </div>
            </div>
          </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-8 items-start">
            <div className="rounded-2xl overflow-hidden">
              <ImageWithFallback
              src={HeroImage}
              alt="Hero"
              className="w-full h-auto rounded-2xl object-cover"
              />
            </div>

            <div className="bg-transparent text-gray-900 self-stretch rounded-2xl overflow-hidden">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-transparent">
              <ImageWithFallback
                src={HeroMock}
                alt="Analytics mock"
                className="w-full h-full object-cover rounded-2xl"
              />
              </div>
            </div>
            
            </div>
        </section>

        {/* Rewards System Section */}
        <section id="rewards" className="container mx-auto px-4 py-24 max-w-7xl">
          <div className="space-y-16">
            {/* Section Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h2 className="hero-title text-4xl md:text-5xl font-regular tracking-tight">
                Loyalty rewards that
                <br />
                <span className="text-gray-900">
                  customers actually use
                </span>
                </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Traditional loyalty programs suffer from 70% dormancy rates. 
                Pointhed deploys rewards where attention lives — inside WhatsApp conversations. 
                Zero friction. Maximum activation.
              </p>
            </div>

            {/* Visual Grid */}
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-0">
              {/* Card 1 */}
              <Card className="bg-[#F7F8FF] overflow-hidden group transition-all border-transparent gap-y-0">
              <div className="aspect-[4/3] relative overflow-hidden">
              <ImageWithFallback
              src="https://images.pexels.com/photos/7309317/pexels-photo-7309317.jpeg"
              alt="Woman photographing a mug"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 " />
              </div>
              <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              <Gift className="size-5 text-blue-400" />
              </div>
              <h3 className="font-semibold">Point Accumulation</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
              Customers earn points through purchase, referral, and engagement. 
              Balance updates appear inline — no separate app required.
              </p>
              </div>
              </Card>

              {/* Card 2 */}
              <Card className="bg-[#F7F8FF] overflow-hidden group transition-all border-transparent gap-y-0">
              <div className="aspect-[4/3] relative overflow-hidden">
                <ImageWithFallback
                  src="https://images.pexels.com/photos/7697222/pexels-photo-7697222.jpeg"
                  alt="Mobile shopping"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 " />
              </div>
              <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
              <TrendingUp className="size-5 text-purple-400" />
              </div>
              <h3 className="font-semibold">Swipeable Redemption</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
              Interactive card carousels let customers browse and redeem rewards 
              without leaving the conversation. One swipe. One tap. Done.
              </p>
              </div>
              </Card>

              {/* Card 3 */}
              <Card className="bg-[#F7F8FF] overflow-hidden group transition-all border-transparent gap-y-0">
              <div className="aspect-[4/3] relative overflow-hidden">
                <ImageWithFallback
                  src="https://images.pexels.com/photos/6205541/pexels-photo-6205541.jpeg"
                  alt="Baker passing pastry to coworker"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 " />
              </div>
              <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
              <Zap className="size-5 text-green-400" />
              </div>
              <h3 className="font-semibold">Smart Triggers</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
              System detects dormancy and surfaces personalized reward prompts 
              before customers churn. Retention by design, not reaction.
              </p>
              </div>
              </Card>
            </div>     
          </div>
        </section>

        <section className="container mx-4 sm:mx-6 md:mx-auto px-8 py-20 max-w-7xl rounded-2xl overflow-hidden bg-[#161616]">
          <div className="mx-auto px-4 max-w-7xl space-y-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl tracking-tight hero-title font-regular text-white">
              Revenue Impact Calculator
              </h2>
              <p className="text-gray-400 leading-relaxed text-lg">
              Real data. Real conversion mechanics. Zero speculation.
              </p>
            </div>

            {/* Calculator Card */}
            <Card className="border-[#2C2C2C] bg-transparent p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-12">
          {/* Inputs */}
          <div className="space-y-8">
            {/* Currency Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">
                Currency
              </Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-11 px-4 bg-[#1a1a1a] text-white border border-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono text-sm"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  paddingRight: '2.5rem',
                }}
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.flag} {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-white">
            Monthly Customers
                </Label>
                <span className="font-mono text-sm text-white">
            {monthlyCustomers.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={monthlyCustomers}
                onChange={(e) => setMonthlyCustomers(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-white">
            Average Order Value
                </Label>
                <span className="font-mono text-sm text-white">
            {formatCurrency(avgOrderValue)}
                </span>
              </div>
              <input
                type="range"
                min={getCurrentCurrencyConfig().min}
                max={getCurrentCurrencyConfig().max}
                step={getCurrentCurrencyConfig().step}
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-white">
            Purchase Frequency (annual)
                </Label>
                <span className="font-mono text-sm text-white">
            {purchaseFrequency.toFixed(1)}×
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="0.5"
                value={purchaseFrequency}
                onChange={(e) => setPurchaseFrequency(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-white">
            Program Engagement Rate
                </Label>
                <span className="font-mono text-sm text-white">
            {engagementRate}%
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={engagementRate}
                onChange={(e) => setEngagementRate(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-400 leading-relaxed">
                % of customers who actively engage with loyalty features
              </p>
            </div>

            {/* Methodology */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-mono leading-relaxed">
                MODEL: {engagementRate}% engaged see +12% frequency, +10% AOV
                <br />
                Effective lift: +{liftPercentage}% | Excludes reward costs (~4-6%)
              </p>
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
                Current Annual Revenue
              </p>
              <p className="text-2xl font-mono text-white">
                {formatCurrency(currentRevenue)}
              </p>
            </div>

            <div className="h-px " />

            <div className="space-y-2">
              <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
                Projected with Pointhed
              </p>
              <p className="text-2xl font-mono text-white">
                {formatCurrency(projectedRevenue)}
              </p>
            </div>

            <div className="h-px " />

            {/* Lift Display */}
            <div className="relative">
              <div
                className={`
            p-6 rounded-xl border transition-all duration-500
            ${showGlow
              ? 'border-gray-500 bg-[#1E1E1E]'
              : 'border-gray-500/20 bg-[#1E1E1E]'
            }
                `}
              >
                <p className="text-sm font-mono text-green-300/80 uppercase tracking-wider mb-2">
            Annual Revenue Lift
                </p>
                <p
            className={`
              text-4xl font-mono font-bold transition-all duration-500
              text-green-300
            `}
                >
            +{formatCurrency(annualLift)}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  +{liftPercentage}% total revenue increase
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Modeled on aggregate data from 2,400+ implementations across retail, 
              hospitality, and service categories. Assumes {engagementRate}% active program engagement. 
              Excludes reward costs (typically 4-6% of incremental revenue). Early-stage programs 
              (months 1-6) see 50-70% of projected results. Your execution, category, and 
              baseline retention determine actual outcomes.
            </p>
          </div>
              </div>
            </Card>
          </div>
        </section>

        {false && (
          /* Feature Bento */
          <section id="features" className="container mx-auto px-4 py-24 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-6">
            {/* Panel 1: Native WhatsApp UI */}
            <Card className="border-gray-200 bg-white shadow-sm p-8 hover:shadow-md transition-all duration-300 group">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="size-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Native WhatsApp UI
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Interactive components render as first-class UI inside the conversation. 
                  Swipeable cards, contextual actions, inline selection — zero redirects, 
                  zero app downloads. Customers engage without friction because there is no friction.
                </p>
                <div className="pt-2">
                  <span className="text-xs font-mono text-gray-500">
                    NO APPS · NO WEB VIEWS · NO COMPROMISE
                  </span>
                </div>
              </div>
            </Card>

            {/* Panel 2: IQ-Driven Logic */}
            <Card className="border-gray-200 bg-white shadow-sm p-8 hover:shadow-md transition-all duration-300 group">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="size-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">
                  IQ-Driven Logic
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Behavioral triggers detect intent before customers disengage. The system reads 
                  purchase velocity, inactivity patterns, and basket signals — then surfaces the 
                  precise reward or prompt required to maintain momentum. Intelligence, not automation.
                </p>
                <div className="pt-2">
                  <span className="text-xs font-mono text-gray-500">
                    PREDICTIVE · CONTEXTUAL · PREEMPTIVE
                  </span>
                </div>
              </div>
            </Card>

            {/* Panel 3: Frictionless Conversion */}
            <Card className="border-gray-200 bg-white shadow-sm p-8 hover:shadow-md transition-all duration-300 group">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="size-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Frictionless Conversion
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Shortest possible path from reward visibility to transaction completion. 
                  One tap to view. One swipe to select. One confirmation to convert. The system 
                  eliminates hesitation by design. Speed is clarity. Clarity is conversion.
                </p>
                <div className="pt-2">
                  <span className="text-xs font-mono text-gray-500">
                    3 TOUCHES · 8 SECONDS · ZERO DROPOFF
                  </span>
                </div>
              </div>
            </Card>
          </div>
          </section>
        )}

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 py-32 max-w-4xl">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-regular tracking-tight hero-title ">
                Precision built for operators
                <br />
                who understand leverage
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Early access closes when we reach technical capacity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('hero-waitlist-form');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] px-8 py-3 rounded-md text-sm font-regular hover:opacity-90 transition-opacity"
            >
              Get Early Access
              <ArrowRight className="size-5" />
            </button>
          </div>
        </section>
        {/* Footer */}
        <footer className="border-t border-gray-200 ">
          <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                {/* <img src={LogoText} alt="Pointhed" className="h-4" /> */}
                <span className="font-mono text-sm text-gray-600">
                  Pointhed © {new Date().getFullYear()}
                </span>
              </div>
              <div className="flex items-center gap-8 text-sm text-gray-500">
                <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Documentation
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                  System Status
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Component-scoped variables + Custom slider styles */}
      <style>{`
        .waitlist-scope {
          --primary: #161616;
          --primary-foreground: #ffffff;
          --sidebar-primary: #161616;
          --sidebar-primary-foreground: #ffffff;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          border: 2px solid var(--primary-foreground);
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(13,12,34,0.12);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(13,12,34,0.16);
          transform: scale(1.06);
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: 2px solid var(--primary-foreground);
          box-shadow: 0 0 0 4px rgba(13,12,34,0.12);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .slider::-moz-range-thumb:hover {
          box-shadow: 0 0 0 6px rgba(13,12,34,0.16);
          transform: scale(1.06);
        }
      `}</style>
    </div>
  );
}