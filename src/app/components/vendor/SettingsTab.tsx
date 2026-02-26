import { useState, useEffect, useMemo, useRef } from 'react';
import { useUnsavedChanges } from '../../lib/unsavedChanges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
// Team-related UI removed; Dialog and Table no longer used here
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Store, 
  Gift, 
  Clock, 
  MessageSquare,
  Bell,
  Users,
  CreditCard,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Palette,
  QrCode,
  Shield,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { apiClient } from '../../../lib/api';
import { getCurrencySymbol, formatMajor } from '../../../lib/mockData';
import { useAuth } from '../../../lib/auth';

export function SettingsTab() {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [homeCurrency, setHomeCurrency] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);

  // Loyalty settings
  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);
  const [welcomeBonusPoints, setWelcomeBonusPoints] = useState('10');
  const [burnRate, setBurnRate] = useState(0.01);
  const [earnUnit, setEarnUnit] = useState(1000); // Fixed, read from backend
  const [pointValue, setPointValue] = useState(10); // Calculated
  const [minRewardValueMajor, setMinRewardValueMajor] = useState('');
  const [minimumPurchase, setMinimumPurchase] = useState('1000');
  const [pointsExpiryEnabled, setPointsExpiryEnabled] = useState(false);
  const [pointsExpiry, setPointsExpiry] = useState('365');
  const [pointsExpiryUnit, setPointsExpiryUnit] = useState<'days' | 'months' | 'years'>('days');

  // Notifications
  const [notifyPurchase, setNotifyPurchase] = useState(true);
  const [notifyRedemption, setNotifyRedemption] = useState(true);
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [expiryReminderDays, setExpiryReminderDays] = useState('7');
  const [notifyMilestone, setNotifyMilestone] = useState(true);
  // Vendor notifications
  const [notifyNewClaims, setNotifyNewClaims] = useState(true);
  // Points expiry notifications (to customers)
  const [notifyPointsExpiry, setNotifyPointsExpiry] = useState(true);
  const [notifyPointsExpiryWarning, setNotifyPointsExpiryWarning] = useState(true);

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [logoUrl, setLogoUrl] = useState('');

  // Guardrails and advanced
  const [guardrailOverride, setGuardrailOverride] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [guardrailThresholds, setGuardrailThresholds] = useState<Record<string, number>>({
    NGN: 1,
    USD: 0.01,
    GBP: 0.01,
    EUR: 0.01,
  });
  const [guardrailUpper, setGuardrailUpper] = useState<Record<string, number>>({
    NGN: 1000,
    USD: 5,
    GBP: 5,
    EUR: 5,
  });
  const [minPurchaseThresholds, setMinPurchaseThresholds] = useState<Record<string, number>>({
    NGN: 1000,
    USD: 1,
    GBP: 1,
    EUR: 1,
  });
  const { setDirty } = useUnsavedChanges();

  // Snapshot for dirty tracking
  const [initialSettingsJson, setInitialSettingsJson] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSettings();

      if (response.business) {
        setBusinessName(response.business.name || '');
        setBusinessEmail(response.business.email || '');
        setBusinessPhone(response.business.phone || '');
        setBusinessAddress(response.business.address || '');
        setVendorCode(response.business.vendorCode || '');
        setHomeCurrency(response.business.homeCurrency || null);
        setTimezone(response.business.timezone || null);
        try {
          if (response.business.homeCurrency) {
            localStorage.setItem('home_currency', response.business.homeCurrency);
          } else {
            localStorage.removeItem('home_currency');
          }
        } catch {}
      }

      if (response.loyalty) {
        setWelcomeBonusEnabled(response.loyalty.welcomeBonusEnabled ?? true);
        setWelcomeBonusPoints(String(response.loyalty.welcomeBonusPoints ?? 10));
        setBurnRate(response.loyalty.burnRate ?? 0.01);
        setEarnUnit(response.loyalty.earnUnit ?? 1000);
        setPointValue(response.loyalty.pointValue ?? 10);
        setMinRewardValueMajor(
          response.loyalty.minRewardValue === null || response.loyalty.minRewardValue === undefined
            ? ''
            : String(response.loyalty.minRewardValue)
        );
        setMinimumPurchase(String(response.loyalty.minimumPurchase ?? 1000));
        setPointsExpiry(String(response.loyalty.pointsExpiryDays ?? 365));
        setPointsExpiryUnit(response.loyalty.pointsExpiryUnit || 'days');
        setPointsExpiryEnabled(response.loyalty.pointsExpiryEnabled ?? false);
      }

      if (response.notifications) {
        setNotifyPurchase(response.notifications.notifyPurchase ?? true);
        setNotifyRedemption(response.notifications.notifyRedemption ?? true);
        setNotifyExpiry(response.notifications.notifyExpiry ?? true);
        setExpiryReminderDays(String(response.notifications.expiryReminderDays ?? 7));
        setNotifyMilestone(response.notifications.notifyMilestone ?? true);
        setNotifyNewClaims(response.notifications.notifyNewClaims ?? true);
        setNotifyPointsExpiry(response.notifications.notifyPointsExpiry ?? true);
        setNotifyPointsExpiryWarning(response.notifications.notifyPointsExpiryWarning ?? true);
      }

      if (response.branding) {
        setPrimaryColor(response.branding.primaryColor || '#2563eb');
        setLogoUrl(response.branding.logoUrl || '');
      }

      if (response.advanced) {
        setTestMode(response.advanced.testMode ?? false);
      }

      try {
        if (response.guardrails) {
          if (response.guardrails.guardrailThresholds) setGuardrailThresholds(response.guardrails.guardrailThresholds);
          if (response.guardrails.guardrailUpper) setGuardrailUpper(response.guardrails.guardrailUpper);
          if (response.guardrails.minPurchaseThresholds) setMinPurchaseThresholds(response.guardrails.minPurchaseThresholds);
        }
      } catch {}

      const snapshot = {
        business: {
          name: response.business?.name || '',
          email: response.business?.email || '',
          phone: response.business?.phone || '',
          address: response.business?.address || '',
          vendorCode: response.business?.vendorCode || '',
          homeCurrency: response.business?.homeCurrency || null,
          timezone: response.business?.timezone || null,
        },
        loyalty: {
          welcomeBonusEnabled: response.loyalty?.welcomeBonusEnabled ?? true,
          welcomeBonusPoints: Number(response.loyalty?.welcomeBonusPoints ?? 10),
          burnRate: response.loyalty?.burnRate ?? 0.01,
          minRewardValue: response.loyalty?.minRewardValue ?? null,
          minimumPurchase: Number(response.loyalty?.minimumPurchase ?? 1000),
          pointsExpiryEnabled: response.loyalty?.pointsExpiryEnabled ?? false,
          pointsExpiryDays: Number(response.loyalty?.pointsExpiryDays ?? 365),
          pointsExpiryUnit: response.loyalty?.pointsExpiryUnit || 'days',
        },
        notifications: {
          notifyPurchase: response.notifications?.notifyPurchase ?? true,
          notifyRedemption: response.notifications?.notifyRedemption ?? true,
          notifyExpiry: response.notifications?.notifyExpiry ?? true,
          expiryReminderDays: Number(response.notifications?.expiryReminderDays ?? 7),
          notifyMilestone: response.notifications?.notifyMilestone ?? true,
          notifyNewClaims: response.notifications?.notifyNewClaims ?? true,
          notifyPointsExpiry: response.notifications?.notifyPointsExpiry ?? true,
          notifyPointsExpiryWarning: response.notifications?.notifyPointsExpiryWarning ?? true,
        },
        branding: {
          primaryColor: response.branding?.primaryColor || '#2563eb',
          logoUrl: response.branding?.logoUrl || '',
        },
        advanced: {
          testMode: response.advanced?.testMode ?? false,
        },
      };

      setInitialSettingsJson(JSON.stringify(snapshot));
      setGuardrailOverride(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);


  // Point value is now derived from fixed earn rate × burn rate (returned by backend)
  // No longer computed client-side from pointsPerNaira
  const currency = homeCurrency || (typeof window !== 'undefined' ? (localStorage.getItem('home_currency') || 'NGN') : 'NGN');

  const getDefaultMinRewardValueMajorFor = (code: string | null | undefined) => {
    const c = code || 'NGN';
    // New spec: GBP/USD/EUR = 5, NGN = 500
    const map: Record<string, number> = {
      NGN: 500,
      GBP: 5,
      USD: 5,
      EUR: 5,
    };
    return map[c] ?? 5;
  };

  const defaultMinRewardValueMajor = getDefaultMinRewardValueMajorFor(
    homeCurrency || (typeof window !== 'undefined' ? (localStorage.getItem('home_currency') || 'NGN') : 'NGN')
  );

  const getDefaultMinPurchase = (code: string | null | undefined) => {
    const c = code || 'NGN';
    return minPurchaseThresholds[c] ?? 1;
  };

  const prevCurrencyRef = useRef<string | null>(null);

  useEffect(() => {
    const prevCurrency = prevCurrencyRef.current;
    const nextCurrency = homeCurrency || (typeof window !== 'undefined' ? (localStorage.getItem('home_currency') || 'NGN') : 'NGN');

    const prevDefaultMinReward = prevCurrency ? getDefaultMinRewardValueMajorFor(prevCurrency) : null;
    const prevDefaultMinPurchase = prevCurrency ? getDefaultMinPurchase(prevCurrency) : null;

    const nextDefaultMinReward = getDefaultMinRewardValueMajorFor(nextCurrency);
    const nextDefaultMinPurchase = getDefaultMinPurchase(nextCurrency);

    if (minRewardValueMajor === '' || (prevDefaultMinReward != null && Number(minRewardValueMajor) === Number(prevDefaultMinReward))) {
      setMinRewardValueMajor(String(nextDefaultMinReward));
    }

    if (minimumPurchase === '' || (prevDefaultMinPurchase != null && Number(minimumPurchase) === Number(prevDefaultMinPurchase))) {
      setMinimumPurchase(String(nextDefaultMinPurchase));
    }

    prevCurrencyRef.current = nextCurrency;
  }, [homeCurrency, minRewardValueMajor, minimumPurchase, minPurchaseThresholds]);

  // Guardrails: burn rate is validated server-side (0.01-0.05), no client-side guardrail warnings needed
  const showGuardrailWarning = false;

  const minThreshold = minPurchaseThresholds[currency] ?? 1;
  const numericMinPurchase = Number(minimumPurchase || 0);
  const showMinPurchaseWarning = numericMinPurchase > 0 && numericMinPurchase < minThreshold;

  const handleSaveSettings = async () => {
    // Validate minimum reward value before saving
    const minRewardNum = minRewardValueMajor === '' ? defaultMinRewardValueMajor : Number(minRewardValueMajor);
    if (minRewardNum < defaultMinRewardValueMajor) {
      toast.error(`Minimum reward value must be at least ${formatMajor(defaultMinRewardValueMajor, homeCurrency || undefined)}`);
      setMinRewardValueMajor(String(defaultMinRewardValueMajor));
      return;
    }

    setSaveStatus('saving');
    
    try {
      await apiClient.updateSettings({
        business: {
          name: businessName,
          email: businessEmail,
          phone: businessPhone,
          address: businessAddress,
          vendorCode: vendorCode,
          homeCurrency,
          timezone,
        },
        loyalty: {
          welcomeBonusEnabled,
          welcomeBonusPoints: Number(welcomeBonusPoints),
          burnRate,
          minRewardValue: minRewardNum,
          minimumPurchase: Number(minimumPurchase),
          pointsExpiryEnabled,
          pointsExpiryDays: Number(pointsExpiry),
          pointsExpiryUnit,
        },
        notifications: {
          notifyPurchase,
          notifyRedemption,
          notifyExpiry,
          expiryReminderDays: Number(expiryReminderDays),
          notifyMilestone,
        },
        branding: {
          primaryColor,
          logoUrl,
        },
        advanced: {
          testMode,
        },
        guardrailOverride,
      });
      
      setSaveStatus('saved');
      toast.success('Settings saved successfully!');

      // update snapshot so Save becomes disabled until next change
      setInitialSettingsJson(currentSettingsJson);
      try {
        if (homeCurrency) localStorage.setItem('home_currency', homeCurrency);
        else localStorage.removeItem('home_currency');
      } catch (e) {}
      
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      setSaveStatus('idle');
    }
  };

  // Build current settings payload from local state
  const buildCurrentSettings = () => ({
    business: {
      name: businessName,
      email: businessEmail,
      phone: businessPhone,
      address: businessAddress,
      vendorCode,
      homeCurrency,
      timezone,
    },
    loyalty: {
      welcomeBonusEnabled,
      welcomeBonusPoints: Number(welcomeBonusPoints),
      burnRate,
      minRewardValue: minRewardValueMajor === '' ? null : Number(minRewardValueMajor),
      minimumPurchase: Number(minimumPurchase),
      pointsExpiryEnabled,
      pointsExpiryDays: Number(pointsExpiry),
      pointsExpiryUnit,
    },
    notifications: {
      notifyPurchase,
      notifyRedemption,
      notifyExpiry,
      expiryReminderDays: Number(expiryReminderDays),
      notifyMilestone,
      notifyNewClaims,
      notifyPointsExpiry,
      notifyPointsExpiryWarning,
    },
    branding: {
      primaryColor,
      logoUrl,
    },
    advanced: {
      testMode,
    },
  });

  const currentSettingsJson = useMemo(() => JSON.stringify(buildCurrentSettings()), [
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    vendorCode,
    homeCurrency,
    timezone,
    welcomeBonusEnabled,
    welcomeBonusPoints,
    burnRate,
    minRewardValueMajor,
    minimumPurchase,
    pointsExpiryEnabled,
    pointsExpiry,
    pointsExpiryUnit,
    notifyPurchase,
    notifyRedemption,
    notifyExpiry,
    expiryReminderDays,
    notifyMilestone,
    notifyNewClaims,
    notifyPointsExpiry,
    notifyPointsExpiryWarning,
    primaryColor,
    logoUrl,
    testMode,
  ]);

  const dirty = initialSettingsJson !== '' && currentSettingsJson !== initialSettingsJson;

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dirty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Team management moved to TeamsTab */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Settings</h2>
          <p className="text-sm sm:text-base text-gray-600">Configure your loyalty program and business settings</p>
        </div>
        <Button 
            className="w-full sm:w-auto"
            onClick={handleSaveSettings}
            disabled={(showGuardrailWarning && !guardrailOverride) || !dirty || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check className="size-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="size-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {showMinPurchaseWarning && !showGuardrailWarning && (
        <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 rounded-md mt-3">
          <p className="font-medium">Minimum transaction unusually low</p>
          <p className="text-sm text-gray-700">Minimum transaction is {formatMajor(numericMinPurchase, currency)}, which is below the recommended minimum of {formatMajor(minThreshold, currency)}.</p>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={guardrailOverride} onChange={(e) => setGuardrailOverride(e.target.checked)} />
            <span className="text-sm">Override and save anyway</span>
          </label>
        </div>
      )}

      <Tabs defaultValue="business" className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="business" className="px-2 sm:px-4">
            <Store className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="px-2 sm:px-4">
            <Gift className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Loyalty</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="px-2 sm:px-4">
            <Bell className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Notifs</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="px-2 sm:px-4">
            <Shield className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Information Tab */}
        <TabsContent value="business" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Store className="size-4 sm:size-5" />
                Business Information
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Update your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    readOnly
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Contact support to update your business name.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorCode">Vendor Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="vendorCode"
                      value={vendorCode}
                      readOnly
                      disabled
                      placeholder="FASH001"
                      className="font-mono bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3"
                      onClick={() => {
                        // Copy CLAIM_VENDORCODE to clipboard
                        const claimCode = `CLAIM_${vendorCode}`;
                        navigator.clipboard.writeText(claimCode);
                        toast.success(`Copied: ${claimCode}`);
                      }}
                    >
                      <QrCode className="size-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Customers send CLAIM_{vendorCode} to join your program. This code cannot be changed.
                  </p>
                </div>

                

                <div className="space-y-2">
                  <Label htmlFor="businessEmail">
                    <Mail className="size-3 inline mr-1" />
                    Email Address
                  </Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    readOnly
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Contact support to update your email address.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPhone">
                    <Phone className="size-3 inline mr-1" />
                    Phone Number *
                  </Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="+234 901 234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homeCurrency">Home Currency</Label>
                  <Select value={homeCurrency || ''} onValueChange={(v) => setHomeCurrency(v || null)}>
                    <SelectTrigger className="max-w-[160px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">This determines your earn rate and display formatting.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Business Timezone</Label>
                  <Select value={timezone || ''} onValueChange={(v) => setTimezone(v || null)}>
                    <SelectTrigger className="max-w-[220px]">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                      <SelectItem value="Africa/Cairo">Africa/Cairo (EET)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                      <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Used for date/time displays and reporting.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">
                  <MapPin className="size-3 inline mr-1" />
                  Business Address
                </Label>
                <Textarea
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Admiralty Way, Lekki Phase 1, Lagos"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  This information will be displayed to customers in WhatsApp messages and redemption confirmations.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="size-4 sm:size-5" />
                Branding
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Customize your brand appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500">
                    Used in emails and QR codes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#2563eb"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty Program Tab */}
        <TabsContent value="loyalty" className="space-y-4 sm:space-y-6">
          {/* Welcome Bonus */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="size-4 sm:size-5 text-yellow-500" />
                Welcome Bonus
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Reward new customers when they join your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Gift className="size-4 sm:size-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-blue-900 text-sm sm:text-base">Enable Welcome Bonus</p>
                    <p className="text-xs sm:text-sm text-blue-700">
                      Give new customers free points when they join
                    </p>
                  </div>
                </div>
                <Switch
                  checked={welcomeBonusEnabled}
                  onCheckedChange={setWelcomeBonusEnabled}
                  className="flex-shrink-0"
                />
              </div>

              {welcomeBonusEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="welcomeBonusPoints">Welcome Bonus Points *</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="welcomeBonusPoints"
                        type="number"
                        value={welcomeBonusPoints}
                        onChange={(e) => setWelcomeBonusPoints(e.target.value)}
                        min="0"
                        step="10"
                        className="max-w-[150px]"
                      />
                      <span className="text-sm text-gray-600">points per new customer</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Default: 10 points. Adjust based on your reward costs.
                    </p>
                  </div>

                  <Alert className="bg-green-50 border-green-200">
                    <Check className="size-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {welcomeBonusPoints || '0'} points will be automatically awarded to every new customer upon registration.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Points Earning Rules */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="size-4 sm:size-5 text-green-500" />
                Points Earning Rules
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure how customers earn points from transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              {/* Read-only currency reference */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <CreditCard className="size-5 text-blue-600" />
                <div>
                  <span className="text-sm font-medium text-blue-900">Currency: {homeCurrency || 'NGN'}</span>
                  <span className="text-xs text-blue-700 ml-2">(Change in Business Settings above)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minimumPurchase">Minimum Transaction Amount</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{getCurrencySymbol()}</span>
                    <Input
                      id="minimumPurchase"
                      type="number"
                      value={minimumPurchase}
                      onChange={(e) => setMinimumPurchase(e.target.value)}
                      min="0"
                      step="100"
                      className="max-w-[150px]"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Transactions below this amount won't earn points
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Fixed Earn Rate - Read Only */}
                  <Label>Earn Rate (Fixed)</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Zap className="size-4 text-primary" />
                    <span className="text-sm font-medium">
                      {currency === 'NGN' ? '₦1,000' : getCurrencySymbol() + '1'} = 1 point
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This is a fixed rate and cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="burnRate">Point Redemption Value (Burn Rate)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="burnRate"
                      type="range"
                      min="0.01"
                      max="0.05"
                      step="0.01"
                      value={burnRate}
                      onChange={(e) => setBurnRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-sm font-medium min-w-[40px]">{Math.round(burnRate * 100)}%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    1 point = {getCurrencySymbol()}{pointValue.toFixed(currency === 'NGN' ? 0 : 2)} (range: 1% - 5%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minRewardValueMajor">Minimum Reward Value (Redemption Guardrail)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{getCurrencySymbol()}</span>
                    <Input
                      id="minRewardValueMajor"
                      type="number"
                      min={defaultMinRewardValueMajor}
                      value={minRewardValueMajor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*(?:\.\d*)?$/.test(v) || v === '') {
                          setMinRewardValueMajor(v);
                        }
                      }}
                      onBlur={() => {
                        const n = parseFloat(minRewardValueMajor as string);
                        if (isFinite(n)) {
                          // Enforce minimum value based on currency
                          const enforced = Math.max(n, defaultMinRewardValueMajor);
                          setMinRewardValueMajor(String(enforced));
                        }
                      }}
                      placeholder={String(defaultMinRewardValueMajor)}
                      className="max-w-[150px]"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum allowed: {formatMajor(defaultMinRewardValueMajor, homeCurrency || undefined)}. Prevents creating rewards below this value.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Points Calculation Preview</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {(() => {
                    // Fixed earn rate: NGN = ₦1000 per point, others = 1 per point
                    const min = Math.max(1, Number(minimumPurchase || 1));
                    const examples = currency === 'NGN' ? [5000, 15000, 50000] : [5, 15, 50];
                    return examples.map((amt) => (
                      <div className="flex justify-between" key={amt}>
                        <span>{formatMajor(amt, currency)} purchase:</span>
                        <span className="font-medium text-gray-900">
                          {min > amt ? '0 points (below minimum)' : `${Math.floor(amt / earnUnit)} points`}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Expiry */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="size-4 sm:size-5 text-orange-500" />
                Points Expiry
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Set when customer points expire
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-orange-50 rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="size-4 sm:size-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-orange-900 text-sm sm:text-base">Enable Points Expiry</p>
                    <p className="text-xs sm:text-sm text-orange-700">
                      Points will expire after a set period
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pointsExpiryEnabled}
                  onCheckedChange={setPointsExpiryEnabled}
                  className="flex-shrink-0"
                />
              </div>

              {pointsExpiryEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-orange-200">
                  <div className="space-y-2">
                    <Label htmlFor="pointsExpiry">Points Valid For</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="pointsExpiry"
                        type="number"
                        value={pointsExpiry}
                        onChange={(e) => setPointsExpiry(e.target.value)}
                        min="30"
                        step="30"
                        className="max-w-[120px]"
                      />
                      <Select value={pointsExpiryUnit} onValueChange={(v) => setPointsExpiryUnit(v as 'days' | 'months' | 'years')}>
                        <SelectTrigger className="max-w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500">
                      Points expire {pointsExpiry} {pointsExpiryUnit} after being earned
                    </p>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="size-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Customers will be notified {expiryReminderDays} days before their points expire.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="size-4 sm:size-5 text-purple-500" />
                Customer Notifications
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Choose which notifications customers receive via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              {/* Transaction Notifications */}
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="size-4 sm:size-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Transaction Confirmations</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Notify customers when they earn points
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifyPurchase}
                  onCheckedChange={setNotifyPurchase}
                  className="flex-shrink-0"
                />
              </div>

              {/* Redemption Notifications */}
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Gift className="size-4 sm:size-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Reward Redemptions</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Confirm when rewards are redeemed
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifyRedemption}
                  onCheckedChange={setNotifyRedemption}
                  className="flex-shrink-0"
                />
              </div>

              {/* Expiry Notifications */}
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="size-4 sm:size-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">Points Expiry Reminders</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Warn customers before points expire
                    </p>
                    {notifyExpiry && (
                      <div className="mt-3">
                        <Label htmlFor="expiryDays" className="text-xs">
                          Send reminder
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="expiryDays"
                            type="number"
                            value={expiryReminderDays}
                            onChange={(e) => setExpiryReminderDays(e.target.value)}
                            min="1"
                            max="30"
                            className="max-w-[80px] h-8"
                          />
                          <span className="text-sm text-gray-600">days before expiry</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={notifyExpiry}
                  onCheckedChange={setNotifyExpiry}
                  className="flex-shrink-0"
                />
              </div>

              {/* Milestone Notifications */}
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="size-4 sm:size-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Milestone Achievements</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Celebrate when customers reach milestones
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifyMilestone}
                  onCheckedChange={setNotifyMilestone}
                  className="flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Notifications Card */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mail className="size-4 sm:size-5 text-blue-500" />
                Vendor Notifications
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Notifications sent to you and your team via email
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              {/* New Claims Notification */}
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="size-4 sm:size-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">New Claim Alerts</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Email admins when customers submit new transaction claims
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifyNewClaims}
                  onCheckedChange={setNotifyNewClaims}
                  className="flex-shrink-0"
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="size-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs sm:text-sm">
                  Notifications are sent to all admin and owner accounts for your business.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="size-4 sm:size-5" />
                Subscription & Billing
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage your platform subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">Current Plan</p>
                  <p className="text-sm text-blue-700">Professional Plan</p>
                </div>
                <Badge className="bg-blue-600">Active</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-gray-600">Monthly Price</p>
                  <p className="font-medium">₦15,000 / month</p>
                </div>
                <div>
                  <p className="text-gray-600">Next Billing</p>
                  <p className="font-medium">Jan 20, 2025</p>
                </div>
                <div>
                  <p className="text-gray-600">Customers</p>
                  <p className="font-medium">245 / 1,000</p>
                </div>
                <div>
                  <p className="text-gray-600">Messages</p>
                  <p className="font-medium">1,240 / 10,000</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" className="flex-1 text-xs sm:text-sm">
                  <CreditCard className="size-4 mr-2" />
                  <span className="hidden sm:inline">Update Payment Method</span>
                  <span className="sm:hidden">Update Payment</span>
                </Button>
                <Button variant="outline" className="flex-1 text-xs sm:text-sm">
                  View Invoices
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Shield className="size-4 sm:size-5" />
                API & Integrations
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Connect with external systems
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="example_key_hidden"
                    readOnly
                    className="font-mono"
                  />
                  <Button variant="outline">Copy</Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use this key to integrate with POS systems or custom applications
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Available Integrations</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-gray-100 rounded flex items-center justify-center">
                        <MessageSquare className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">WhatsApp Business API</p>
                        <p className="text-xs text-gray-600">Connected</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-gray-100 rounded flex items-center justify-center">
                        <CreditCard className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">POS Integration</p>
                        <p className="text-xs text-gray-600">Coming soon</p>
                      </div>
                    </div>
                    <Badge variant="outline">Soon</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Mode Card */}
          <Card className="border-amber-200">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Zap className="size-4 sm:size-5 text-amber-600" />
                Test Mode
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Enable test mode to prevent WhatsApp messages from being sent
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                <div>
                  <p className="font-medium text-amber-900">Sandbox Mode</p>
                  <p className="text-sm text-amber-700">
                    When enabled, no WhatsApp messages will be sent to customers
                  </p>
                </div>
                <Switch
                  checked={testMode}
                  onCheckedChange={setTestMode}
                />
              </div>

              {testMode && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="size-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs sm:text-sm">
                    Test mode is active. All WhatsApp messages will be logged but not sent.
                    Points and transactions will still be recorded normally.
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-gray-500">
                Use test mode for training staff, testing configurations, or during development.
                Disable test mode before going live to ensure customers receive notifications.
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-red-900 text-base sm:text-lg">Danger Zone</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Irreversible actions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-red-900 text-sm sm:text-base">Export All Data</p>
                  <p className="text-xs sm:text-sm text-red-700">Download a copy of all your data</p>
                </div>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto text-sm">
                  Export
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-red-900 text-sm sm:text-base">Delete Account</p>
                  <p className="text-xs sm:text-sm text-red-700">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto text-sm">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
