import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working'|'ready'|'error'>('working');
  const [message, setMessage] = useState<string>('Finishing sign up...');

  useEffect(() => {
    (async () => {
      try {
        // In Supabase v2, the session is automatically set from the URL hash
        // We just need to wait a moment for it to be processed and then check for it
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          setStatus('error');
          setMessage('No active session found. Please use the confirmation link from your email and try again.');
          return;
        }

        // Ensure API client uses Supabase session (clear legacy token)
        apiClient.setToken(null);

        // Retrieve pending signup data from localStorage or user metadata
        let profile = null;
        const pendingRaw = localStorage.getItem('pending_signup');
        
        if (pendingRaw) {
          profile = JSON.parse(pendingRaw);
        } else {
          // Fallback: check Supabase user metadata
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            profile = {
              businessName: user.user_metadata.businessName,
              contactPhone: user.user_metadata.contactPhone,
              fullName: user.user_metadata.fullName,
              country: user.user_metadata.country || 'GB'
            };
          }
        }
        
        if (!profile || !profile.businessName || !profile.contactPhone || !profile.fullName) {
          // Check if user already has tenant (maybe already provisioned)
          try {
            const userData = await apiClient.getCurrentUser();
            if (userData?.user?.tenant) {
              localStorage.removeItem('pending_signup');
              const destination = userData.user.tenant.onboardingCompleted ? '/overview' : '/onboarding';
              setStatus('ready');
              navigate(destination);
              return;
            }
          } catch (checkErr) {
            console.error('Error checking user:', checkErr);
          }
          
          // No pending data and no existing tenant - need to complete signup
          setStatus('error');
          setMessage('Signup data not found. Please complete your signup again.');
          setTimeout(() => navigate('/signup'), 3000);
          return;
        }

        // Call provisioning endpoint to create tenant/vendor resources
        await apiClient.provisionVendor({
          businessName: profile.businessName,
          contactPhone: profile.contactPhone,
          fullName: profile.fullName,
          country: profile.country || 'GB',
          homeCurrency: profile.homeCurrency || 'GBP',
          timezone: profile.timezone || 'Europe/London'
        });

        // Verify backend recognizes the user
        const verify = await apiClient.getCurrentUser();
        if (!verify?.user) {
          setStatus('error');
          setMessage('Provisioning succeeded but backend did not return a user. Try logging in.');
          return;
        }

        // Cleanup and navigate to onboarding
        localStorage.removeItem('pending_signup');
        setStatus('ready');
        navigate('/onboarding');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setMessage(err?.message || 'An unexpected error occurred.');
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Completing sign up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{message}</p>
          {status === 'working' && <p className="text-sm text-gray-600">If this takes too long, ensure you clicked the confirmation link in your email and that the redirect URL is correct.</p>}
          {status === 'error' && (
            <div className="flex gap-2 mt-4">
              <Button onClick={() => window.location.reload()}>Try again</Button>
              <Button variant="outline" onClick={() => navigate('/signup')}>Back to signup</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
