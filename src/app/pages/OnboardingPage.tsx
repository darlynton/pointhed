import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { apiClient } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { LogOut } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [formData, setFormData] = useState({
    businessType: 'retail',
    address: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    // Check if user is already onboarded
    const checkOnboardingStatus = async () => {
      try {
        const response = await apiClient.getCurrentUser();
        setUserData(response.user);
        
        if (response.user?.tenant?.onboardingCompleted) {
          // Already onboarded, redirect to dashboard
          navigate('/dashboard/overview');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('Failed to load user data. Please try again.');
      }
    };

    checkOnboardingStatus();
  }, [navigate]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      navigate('/login');
    }
  };

  const validateForm = () => {
    if (!formData.businessType) {
      setError('Please select a business type');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Business address is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
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

    try {
      // Update tenant settings
      await apiClient.request('/settings/business', {
        method: 'PUT',
        body: {
          businessType: formData.businessType,
          address: formData.address,
          city: formData.city,
          state: formData.state,
        }
      });

      // Mark onboarding as completed
      await apiClient.request('/settings/onboarding', {
        method: 'PUT',
        body: { onboardingCompleted: true }
      });

      // Refresh user data to get updated onboarding status
      await apiClient.getCurrentUser();

      // Navigate to dashboard - user data is now updated
      navigate('/dashboard/overview', { replace: true });
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err?.message || 'Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  const businessTypes = [
    { value: 'retail', label: 'Retail Store' },
    { value: 'restaurant', label: 'Restaurant / Café' },
    { value: 'salon', label: 'Salon / Spa' },
    { value: 'gym', label: 'Gym / Fitness' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'supermarket', label: 'Supermarket' },
    { value: 'fashion', label: 'Fashion / Boutique' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'services', label: 'Professional Services' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-6 sm:p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl">Complete Your Setup</CardTitle>
          <CardDescription className="text-sm">
            {userData?.tenant?.businessName && `Welcome ${userData.tenant.businessName}! `}
            Tell us a bit more about your business to get started.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessType" className="text-sm">Business Type *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleChange('businessType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">This helps us customize your experience</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">Business Address *</Label>
                <Textarea
                  id="address"
                  placeholder="123 High Street"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={loading}
                  rows={3}
                  maxLength={200}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm">City *</Label>
                  <Input
                    id="city"
                    placeholder="London"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={loading}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm">State/Region</Label>
                  <Input
                    id="state"
                    placeholder="Greater London"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    disabled={loading}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Completing Setup...' : 'Complete Setup'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {loggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
