import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { formatNGN, formatMajor, getCurrencySymbol, getCurrencyConfig } from '../../../lib/mockData';
import apiClient from '../../../lib/api';
import { Plus, Edit, Trash2, Package, Tag, Award, Clock, QrCode, Scan, AlertCircle, Search, Download, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Switch } from '../ui/switch';

export function RewardsTab() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'redemptions'>('redemptions');
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rewardsPage, setRewardsPage] = useState(1);
  const rewardsLimit = 9;
  const [earnUnit, setEarnUnit] = useState<number>(1000);
  const [burnRate, setBurnRate] = useState<number>(0.01);
  const [pointValue, setPointValue] = useState<number>(10);
  const [homeCurrency, setHomeCurrency] = useState<string | null>(null);
  const [minRewardValueMajor, setMinRewardValueMajor] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getRewards();
        if (mounted && res && res.data) {
          const normalize = (r:any) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? r.desc ?? '',
            pointsRequired: r.pointsRequired ?? r.points_required ?? 0,
            monetaryValueNgn: r.monetaryValueNgn ?? r.monetary_value_ngn ?? 0,
            isActive: (r.isActive ?? r.is_active) === undefined ? true : (r.isActive ?? r.is_active),
            stockQuantity: r.stockQuantity ?? r.stock_quantity ?? null,
            maxRedemptionsPerCustomer: r.maxRedemptionsPerCustomer ?? r.max_redemptions_per_customer ?? null,
            validFrom: r.validFrom ?? r.valid_from ?? null,
            validUntil: r.validUntil ?? r.valid_until ?? null,
            termsAndConditions: r.termsAndConditions ?? r.terms_and_conditions ?? null,
            category: r.category ?? null,
            totalRedemptions: r.totalRedemptions ?? r.total_redemptions ?? 0,
            createdAt: r.createdAt ?? r.created_at ?? null,
            updatedAt: r.updatedAt ?? r.updated_at ?? null,
            // preserve original for any other fields
            raw: r,
          });
          setRewards(res.data.map(normalize));
        }
      } catch (e) {
        console.error('Failed to load rewards', e);
      } finally {
        setLoading(false);
      }
    };
    load();
    // load tenant settings to get earn unit, burn rate, and point value for suggestions
    const loadSettings = async () => {
      try {
        const s = await apiClient.getSettings();
        // New loyalty spec: fixed earn rate, configurable burn rate
        const eu = s?.loyalty?.earnUnit ?? 1000;
        const br = s?.loyalty?.burnRate ?? 0.01;
        const pv = s?.loyalty?.pointValue ?? (eu * br);
        setEarnUnit(Number(eu) || 1000);
        setBurnRate(Number(br) || 0.01);
        setPointValue(Number(pv) || 10);
        const minReward = s?.loyalty?.minRewardValue ?? s?.loyalty?.minRewardValueMajor ?? null;
        setMinRewardValueMajor(minReward === null || minReward === undefined ? null : Number(minReward));
        const hc = s?.business?.homeCurrency || (typeof window !== 'undefined' ? (localStorage.getItem('home_currency') || null) : null);
        setHomeCurrency(hc);
      } catch (e) {
        // ignore
      }
    };
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const getCurrencyValueFloor = () => {
    const { code } = getCurrencyConfig(homeCurrency || undefined);
    // Per spec: Minimum reward values - GBP/USD/EUR = 5, NGN = 500
    const floorByCurrency: Record<string, number> = {
      NGN: 500,
      GBP: 5,
      USD: 5,
      EUR: 5,
    };
    const absoluteMin = floorByCurrency[code] ?? 5;
    
    // Use configured value only if it's >= the absolute minimum for this currency
    if (minRewardValueMajor != null && Number.isFinite(minRewardValueMajor)) {
      return Math.max(absoluteMin, Number(minRewardValueMajor));
    }
    return absoluteMin;
  };

  const computeSuggestedPointsFromMajor = (majorInput: any) => {
    try {
      const major = Number(majorInput) || 0;
      if (major <= 0) return 0;
      const effectiveMajor = Math.max(major, getCurrencyValueFloor());
      // New spec: points_required = ceil(target_reward_value / point_value)
      const pv = pointValue || (earnUnit * burnRate);
      if (pv <= 0) return 0;
      const pts = Math.ceil(effectiveMajor / pv);
      return Math.max(1, pts);
    } catch (e) { return 0; }
  };

  const computeSuggestedMonetaryFromPoints = (pointsInput: any) => {
    try {
      const points = Number(pointsInput) || 0;
      if (points <= 0) return 0;
      // New spec: monetary = points * point_value
      const pv = pointValue || (earnUnit * burnRate);
      const monetaryMajor = points * pv;
      // Round to 2 decimals for display (0 decimals for NGN)
      const decimals = homeCurrency === 'NGN' ? 0 : 2;
      return Number(monetaryMajor.toFixed(decimals));
    } catch (e) { return 0; }
  };

  const currencyValueFloor = getCurrencyValueFloor();

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newReward, setNewReward] = useState<{
    name: string;
    description: string;
    pointsRequired: string | number;
    monetaryValueMajor: string | number;
    category: string;
    stockQuantity: number | null;
    maxRedemptionsPerCustomer: string | number | null;
    validFrom: string;
    validUntil: string;
    termsAndConditions: string;
  }>({
    name: '',
    description: '',
    pointsRequired: '',
    monetaryValueMajor: '',
    category: '',
    stockQuantity: null,
    maxRedemptionsPerCustomer: null,
    validFrom: '',
    validUntil: '',
    termsAndConditions: ''
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createAutoPoints, setCreateAutoPoints] = useState<boolean>(true);
  const [createAutoMonetary, setCreateAutoMonetary] = useState<boolean>(true);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);

  // Pending redemptions state
  const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [allRedemptions, setAllRedemptions] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const redemptionsLimit = 10;
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCodeOpen, setVerifyCodeOpen] = useState(false);
  const [verifyCodeValue, setVerifyCodeValue] = useState('');
  const [quickVerifyError, setQuickVerifyError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanStarting, setScanStarting] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const scanInstanceRef = useRef<any>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const scanSessionRef = useRef(0);
  const scanDetectIntervalRef = useRef<number | null>(null);
  const [quickFulfillSuccess, setQuickFulfillSuccess] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<any>(null);
  const [verifyProcessing, setVerifyProcessing] = useState(false);
  const [fulfillProcessing, setFulfillProcessing] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [fulfillNotes, setFulfillNotes] = useState<string>('');
  const quickVerifyRef = useRef<HTMLDivElement | null>(null);

  const normalizeRedemption = (r: any) => {
    if (!r) return null;
    const reward = r.reward ? {
      id: r.reward.id ?? r.rewardId ?? r.reward_id,
      name: r.reward.name ?? r.rewardName,
      pointsRequired: r.reward.pointsRequired ?? r.reward.points_required ?? r.rewardPointsRequired
    } : (r.rewardName ? { id: r.rewardId, name: r.rewardName, pointsRequired: r.rewardPointsRequired } : null);
    const customerName = r.customer?.name || [r.customer?.firstName, r.customer?.lastName].filter(Boolean).join(' ') || r.customerName;
    const customerPhone = r.customer?.phone || r.customer?.phoneNumber || r.customer?.phone_number || r.customerPhone;
    const pointsUsed = r.pointsUsed ?? r.pointsDeducted ?? r.points_deducted ?? reward?.pointsRequired ?? 0;
    const normalizedStatus = r.status === 'verified' ? 'pending' : (r.status ?? 'pending');
    return {
      ...r,
      id: r.id ?? r.redemptionId ?? r.redemption_id,
      redemptionCode: r.redemptionCode ?? r.redemption_code ?? r.code,
      status: normalizedStatus,
      rewardId: r.rewardId ?? r.reward_id ?? reward?.id,
      reward,
      customer: r.customer ? { ...r.customer, name: customerName, phone: customerPhone } : { name: customerName, phone: customerPhone },
      pointsUsed,
      createdAt: r.createdAt ?? r.created_at,
      fulfilledAt: r.fulfilledAt ?? r.fulfilled_at,
      cancelledReason: r.cancelledReason ?? r.cancellation_reason ?? r.cancelled_reason,
      expiresAt: r.expiresAt ?? r.expires_at
    };
  };

  // Load pending redemptions
  const loadPendingRedemptions = async () => {
    setPendingLoading(true);
    try {
      const res = await apiClient.get('/redemptions?status=pending');
      if (res && res.data && Array.isArray(res.data)) {
        setPendingRedemptions(res.data.map(normalizeRedemption).filter(Boolean));
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
        setPendingRedemptions(res.data.data.map(normalizeRedemption).filter(Boolean));
      } else {
        setPendingRedemptions([]);
      }
    } catch (err) {
      console.error('Failed to load pending redemptions', err);
      setPendingRedemptions([]);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadAllRedemptions = async () => {
    setAllLoading(true);
    try {
      const res = await apiClient.get('/redemptions?status=all');
      if (res && res.data && Array.isArray(res.data)) {
        setAllRedemptions(res.data.map(normalizeRedemption).filter(Boolean));
      } else if (res && res.data && res.data.data && Array.isArray(res.data.data)) {
        setAllRedemptions(res.data.data.map(normalizeRedemption).filter(Boolean));
      } else {
        setAllRedemptions([]);
      }
    } catch (err) {
      console.error('Failed to load redemptions', err);
      setAllRedemptions([]);
    } finally {
      setAllLoading(false);
    }
  };

  // Load pending redemptions on mount and add to main useEffect
  useEffect(() => {
    loadPendingRedemptions();
    loadAllRedemptions();
  }, []);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(rewards.length / rewardsLimit));
    if (rewardsPage > pages) {
      setRewardsPage(pages);
    }
  }, [rewards.length]);

  useEffect(() => {
    setRedemptionsPage(1);
  }, [statusFilter, searchQuery]);

  const pendingCounts = useMemo(() => {
    return pendingRedemptions.reduce((acc: Record<string, number>, redemption: any) => {
      const rewardId = redemption.rewardId || redemption.reward?.id;
      if (rewardId) acc[rewardId] = (acc[rewardId] || 0) + 1;
      return acc;
    }, {});
  }, [pendingRedemptions]);

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return '—';
    }
  };

  const getExpiresAt = (createdAt?: string | Date | null) => {
    if (!createdAt) return null;
    try {
      const base = new Date(createdAt).getTime();
      if (!Number.isFinite(base)) return null;
      return new Date(base + 24 * 60 * 60 * 1000);
    } catch (e) {
      return null;
    }
  };

  const filteredRedemptions = useMemo(() => {
    return allRedemptions
      .filter((r: any) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const rewardName = r.reward?.name || r.rewardName || '';
          const customerName = r.customer?.name || r.customerName || '';
          const customerPhone = r.customer?.phone || r.customerPhone || '';
          const code = r.redemptionCode || r.redemption_code || '';
          return (
            rewardName.toLowerCase().includes(query) ||
            customerName.toLowerCase().includes(query) ||
            customerPhone.toLowerCase().includes(query) ||
            code.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [allRedemptions, statusFilter, searchQuery]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredRedemptions.length / redemptionsLimit));
    if (redemptionsPage > pages) {
      setRedemptionsPage(pages);
    }
  }, [filteredRedemptions.length]);

  const rewardsPages = Math.max(1, Math.ceil(rewards.length / rewardsLimit));
  const pagedRewards = useMemo(() => {
    const start = (rewardsPage - 1) * rewardsLimit;
    return rewards.slice(start, start + rewardsLimit);
  }, [rewards, rewardsPage]);

  const redemptionsPages = Math.max(1, Math.ceil(filteredRedemptions.length / redemptionsLimit));
  const pagedRedemptions = useMemo(() => {
    const start = (redemptionsPage - 1) * redemptionsLimit;
    return filteredRedemptions.slice(start, start + redemptionsLimit);
  }, [filteredRedemptions, redemptionsPage]);

  const redemptionStats = useMemo(() => ({
    total: allRedemptions.length,
    pending: allRedemptions.filter((r: any) => r.status === 'pending').length,
    fulfilled: allRedemptions.filter((r: any) => r.status === 'fulfilled').length,
    cancelled: allRedemptions.filter((r: any) => r.status === 'cancelled').length,
    expired: allRedemptions.filter((r: any) => r.status === 'expired').length
  }), [allRedemptions]);

  const parseRedemptionCodeFromQr = (raw: string) => {
    if (!raw) return '';
    const match = raw.match(/CODE:([A-Z0-9_-]+)/i);
    if (match && match[1]) return match[1];
    const fallback = raw.match(/[A-Z0-9]{6,}/i);
    return fallback ? fallback[0] : '';
  };

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      osc.onended = () => ctx.close();
    } catch (e) {
      // ignore audio errors
    }
  };

  const handleQuickVerify = async (codeOverride?: string) => {
    const code = (codeOverride ?? verifyCodeValue).trim().toUpperCase();
    if (!code) {
      setQuickVerifyError('Please enter a redemption code');
      return;
    }
    try {
        setQuickVerifyError('');
        setVerifyProcessing(true);
        setVerifyCodeValue(code);
        const res = await apiClient.post('/redemptions/verify', {
          redemptionCode: code
        });
        if (res && res.data) {
          const normalized = normalizeRedemption(res.data.data || res.data);
          setSelectedRedemption(normalized);
          setFulfillNotes('');
          setVerifyOpen(false);
          setQuickFulfillSuccess(false);
          loadPendingRedemptions();
          loadAllRedemptions();
        }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Verification failed';
      setQuickVerifyError(msg);
    } finally {
      setVerifyProcessing(false);
    }
  };

  const stopScanner = async () => {
    if (scanDetectIntervalRef.current) {
      window.clearInterval(scanDetectIntervalRef.current);
      scanDetectIntervalRef.current = null;
    }
    if (scanInstanceRef.current) {
      try {
        await scanInstanceRef.current.stop();
      } catch (e) {
        // ignore
      }
      try {
        scanInstanceRef.current.destroy();
      } catch (e) {
        // ignore
      }
      scanInstanceRef.current = null;
    }
    if (scanStreamRef.current) {
      try {
        scanStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {
        // ignore
      }
      scanStreamRef.current = null;
    }
    if (scanVideoRef.current) {
      scanVideoRef.current.srcObject = null;
    }
  };

  const startScanner = async () => {
    if (!scanOpen) return;
    const sessionId = ++scanSessionRef.current;
    setScanError('');
    setScanStatus('Starting camera…');
    setScanStarting(true);
    try {
      if (!window.isSecureContext) {
        setScanError('Camera requires HTTPS or localhost.');
        setScanStatus('');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (scanSessionRef.current !== sessionId) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      scanStreamRef.current = stream;

      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream;
        await scanVideoRef.current.play();
      }
      setScanStatus('Scanning for QR code…');

      // Prefer native BarcodeDetector when available (works well in Brave/Chromium)
      if ('BarcodeDetector' in window && scanVideoRef.current) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          scanDetectIntervalRef.current = window.setInterval(async () => {
            if (!scanVideoRef.current || scanSessionRef.current !== sessionId) return;
            try {
              const results = await detector.detect(scanVideoRef.current);
              if (results && results.length > 0) {
                const raw = results[0].rawValue || '';
                const code = parseRedemptionCodeFromQr(raw);
                if (code) {
                  playBeep();
                  setScanOpen(false);
                  handleQuickVerify(code);
                }
              }
            } catch (e) {
              // ignore detector errors
            }
          }, 300);
          return;
        } catch (e) {
          // fallback to qr-scanner below
        }
      }

      const mod = await import('qr-scanner');
      const QrScanner = mod.default;
      if (QrScanner?.WORKER_PATH === undefined) {
        QrScanner.WORKER_PATH = new URL('qr-scanner/qr-scanner-worker.min.js', import.meta.url).toString();
      }

      const scanner = new QrScanner(
        scanVideoRef.current,
        (result: any) => {
          const raw = typeof result === 'string' ? result : result?.data || '';
          const code = parseRedemptionCodeFromQr(raw);
          if (!code) {
            setScanError('QR code not recognized.');
            return;
          }
            playBeep();
          setScanOpen(false);
          handleQuickVerify(code);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          onDecodeError: () => setScanStatus('Scanning for QR code…')
        }
      );
      scanInstanceRef.current = scanner;
      await scanner.start();
    } catch (e: any) {
      setScanError(e?.message || 'Unable to access camera.');
      setScanStatus('');
    } finally {
      setScanStarting(false);
    }
  };

  useEffect(() => {
    if (!scanOpen) {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanOpen]);

  const handleQuickReset = () => {
    setVerifyCodeValue('');
    setSelectedRedemption(null);
    setQuickVerifyError('');
    setQuickFulfillSuccess(false);
  };

  const handleQuickFulfill = async () => {
    if (!selectedRedemption?.id) return;
    try {
      setFulfillProcessing(true);
      await apiClient.post(`/redemptions/${selectedRedemption.id}/fulfill`, {
        notes: fulfillNotes
      });
      setQuickFulfillSuccess(true);
      loadPendingRedemptions();
      loadAllRedemptions();
      setTimeout(() => handleQuickReset(), 3000);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Fulfillment failed';
      setQuickVerifyError(msg);
    } finally {
      setFulfillProcessing(false);
    }
  };

  const handleQuickCancel = async (reason: string) => {
    if (!selectedRedemption?.id) return;
    try {
      setCancelProcessing(true);
      await apiClient.post(`/redemptions/${selectedRedemption.id}/cancel`, { reason });
      loadPendingRedemptions();
      loadAllRedemptions();
      handleQuickReset();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Cancellation failed';
      setQuickVerifyError(msg);
    } finally {
      setCancelProcessing(false);
    }
  };

  const openEdit = (reward: any) => {
    const toDateInput = (value: any) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    };
    const initialMonetaryMajor = (() => {
      try {
        const { minor } = getCurrencyConfig();
        const minorVal = reward.monetaryValueNgn ?? reward.monetary_value_ngn ?? 0;
        return minorVal != null ? (minorVal / minor) : '';
      } catch (e) { return (reward.monetaryValueNgn ?? reward.monetary_value_ngn ?? 0) / 100; }
    })();
    const initialPoints = reward.pointsRequired ?? reward.points_required ?? 0;
    setSelectedReward({
      id: reward.id,
      name: reward.name,
      description: reward.description || '',
      pointsRequired: reward.pointsRequired ?? reward.points_required ?? 0,
      // show monetary value in major units for the edit input
      monetaryValueMajor: initialMonetaryMajor,
      category: reward.category || '',
      stockQuantity: reward.stockQuantity ?? reward.stock_quantity ?? null,
      maxRedemptionsPerCustomer: reward.maxRedemptionsPerCustomer ?? reward.max_redemptions_per_customer ?? null,
      validFrom: toDateInput(reward.validFrom ?? reward.valid_from),
      validUntil: toDateInput(reward.validUntil ?? reward.valid_until),
      termsAndConditions: reward.termsAndConditions ?? reward.terms_and_conditions ?? '',
      isActive: reward.isActive === undefined ? (reward.is_active === undefined ? true : reward.is_active) : reward.isActive,
      createdAt: reward.createdAt ?? reward.created_at ?? null,
      updatedAt: reward.updatedAt ?? reward.updated_at ?? null
    });
    // Determine whether to auto-update points when monetary value changes in edit
    const suggested = computeSuggestedPointsFromMajor(initialMonetaryMajor);
    setEditAutoPoints(!initialPoints || Number(initialPoints) === Number(suggested));
    setEditOpen(true);
  };

  const [editAutoPoints, setEditAutoPoints] = useState<boolean>(true);
  const [editAutoMonetary, setEditAutoMonetary] = useState<boolean>(true);

  const handleCreate = async () => {
    try {
      // Basic client-side validation (inline)
      const errors: Record<string, string> = {};
      if (!newReward.name || newReward.name.trim() === '') errors.name = 'Reward name is required';
      if (newReward.pointsRequired === '' || isNaN(Number(newReward.pointsRequired))) errors.pointsRequired = 'Points Required must be provided and numeric';
      if (newReward.pointsRequired !== '' && !isNaN(Number(newReward.pointsRequired)) && Number(newReward.pointsRequired) <= 0) errors.pointsRequired = 'Points Required must be greater than 0';
      if (newReward.stockQuantity !== null && Number(newReward.stockQuantity) < 0) errors.stockQuantity = 'Stock Quantity cannot be negative';
      if (newReward.maxRedemptionsPerCustomer !== null && newReward.maxRedemptionsPerCustomer !== '' && Number(newReward.maxRedemptionsPerCustomer) < 0) errors.maxRedemptionsPerCustomer = 'Max redemptions cannot be negative';
      if (newReward.validFrom && newReward.validUntil && newReward.validFrom > newReward.validUntil) errors.validUntil = 'Valid Until must be after Valid From';
      if (Object.keys(errors).length) { setCreateErrors(errors); return; }
      setCreateErrors({});

      const payload = {
        name: newReward.name.trim(),
        description: newReward.description?.trim() || null,
        pointsRequired: Math.floor(Number(newReward.pointsRequired)),
        // convert monetary input (major units) to minor units for storage
        monetaryValueNgn: (() => {
          try {
            const { minor } = getCurrencyConfig();
            return newReward.monetaryValueMajor !== '' && newReward.monetaryValueMajor !== null ? Math.floor(Number(newReward.monetaryValueMajor) * minor) : null;
          } catch (e) {
            return newReward.monetaryValueMajor !== '' && newReward.monetaryValueMajor !== null ? Math.floor(Number(newReward.monetaryValueMajor) * 100) : null;
          }
        })(),
        category: newReward.category || null,
        stockQuantity: newReward.stockQuantity === null ? null : Number(newReward.stockQuantity),
        maxRedemptionsPerCustomer: newReward.maxRedemptionsPerCustomer === null || newReward.maxRedemptionsPerCustomer === '' ? null : Number(newReward.maxRedemptionsPerCustomer),
        validFrom: newReward.validFrom || null,
        validUntil: newReward.validUntil || null,
        termsAndConditions: newReward.termsAndConditions?.trim() || null
      };

      // sanity check
      if (payload.pointsRequired <= 0) {
        setCreateErrors({ pointsRequired: 'Points Required must be greater than 0' });
        return;
      }

      // image is provided as URL (no file upload in UI)

      const res = await apiClient.request('/rewards', { method: 'POST', body: payload });
      if (res && res.data) {
        const r = res.data;
        const normalize = (r:any) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? r.desc ?? '',
          pointsRequired: r.pointsRequired ?? r.points_required ?? 0,
          monetaryValueNgn: r.monetaryValueNgn ?? r.monetary_value_ngn ?? 0,
          isActive: (r.isActive ?? r.is_active) === undefined ? true : (r.isActive ?? r.is_active),
          stockQuantity: r.stockQuantity ?? r.stock_quantity ?? null,
          maxRedemptionsPerCustomer: r.maxRedemptionsPerCustomer ?? r.max_redemptions_per_customer ?? null,
          validFrom: r.validFrom ?? r.valid_from ?? null,
          validUntil: r.validUntil ?? r.valid_until ?? null,
          termsAndConditions: r.termsAndConditions ?? r.terms_and_conditions ?? null,
          totalRedemptions: r.totalRedemptions ?? r.total_redemptions ?? 0,
          category: r.category ?? null,
          createdAt: r.createdAt ?? r.created_at ?? null,
          updatedAt: r.updatedAt ?? r.updated_at ?? null,
          raw: r,
        });
        setRewards(prev => [normalize(r), ...prev]);
        setCreateOpen(false);
        setNewReward({ name: '', description: '', pointsRequired: '', monetaryValueMajor: '', category: '', stockQuantity: null, maxRedemptionsPerCustomer: null, validFrom: '', validUntil: '', termsAndConditions: '' });
        toast.success('reward created successfully');
      }
    } catch (err) {
      console.error('Create reward failed', err);
      toast.error('Failed to create reward');
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Inline validation for edit
      const errors: Record<string, string> = {};
      if (!selectedReward?.name || selectedReward.name.trim() === '') errors.name = 'Reward name is required';
      if (selectedReward?.pointsRequired === '' || isNaN(Number(selectedReward?.pointsRequired))) errors.pointsRequired = 'Points Required must be provided and numeric';
      if (selectedReward?.pointsRequired !== '' && !isNaN(Number(selectedReward?.pointsRequired)) && Number(selectedReward?.pointsRequired) <= 0) errors.pointsRequired = 'Points Required must be greater than 0';
      if (selectedReward?.stockQuantity !== null && selectedReward?.stockQuantity !== '' && Number(selectedReward?.stockQuantity) < 0) errors.stockQuantity = 'Stock Quantity cannot be negative';
      if (selectedReward?.maxRedemptionsPerCustomer !== null && selectedReward?.maxRedemptionsPerCustomer !== '' && Number(selectedReward?.maxRedemptionsPerCustomer) < 0) errors.maxRedemptionsPerCustomer = 'Max redemptions cannot be negative';
      if (selectedReward?.validFrom && selectedReward?.validUntil && selectedReward.validFrom > selectedReward.validUntil) errors.validUntil = 'Valid Until must be after Valid From';
      if (Object.keys(errors).length) { setEditErrors(errors); return; }
      setEditErrors({});

      const payload = {
        name: selectedReward.name,
        description: selectedReward.description,
        pointsRequired: Number(selectedReward.pointsRequired),
        monetaryValueNgn: (() => {
          try {
            const { minor } = getCurrencyConfig();
            return selectedReward.monetaryValueMajor !== '' && selectedReward.monetaryValueMajor !== null ? Math.floor(Number(selectedReward.monetaryValueMajor) * minor) : null;
          } catch (e) {
            return selectedReward.monetaryValueMajor !== '' && selectedReward.monetaryValueMajor !== null ? Math.floor(Number(selectedReward.monetaryValueMajor) * 100) : null;
          }
        })(),
        category: selectedReward.category || null,
        stockQuantity: selectedReward.stockQuantity === null || selectedReward.stockQuantity === '' ? null : Number(selectedReward.stockQuantity),
        maxRedemptionsPerCustomer: selectedReward.maxRedemptionsPerCustomer === null || selectedReward.maxRedemptionsPerCustomer === '' ? null : Number(selectedReward.maxRedemptionsPerCustomer),
        validFrom: selectedReward.validFrom || null,
        validUntil: selectedReward.validUntil || null,
        termsAndConditions: selectedReward.termsAndConditions?.trim() || null,
        isActive: !!selectedReward.isActive
      };

      const res = await apiClient.request(`/rewards/${selectedReward.id}`, { method: 'PUT', body: payload });
      if (res && res.data) {
        const r = res.data;
        const normalize = (r:any) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? r.desc ?? '',
          pointsRequired: r.pointsRequired ?? r.points_required ?? 0,
          monetaryValueNgn: r.monetaryValueNgn ?? r.monetary_value_ngn ?? 0,
          isActive: (r.isActive ?? r.is_active) === undefined ? true : (r.isActive ?? r.is_active),
          stockQuantity: r.stockQuantity ?? r.stock_quantity ?? null,
          maxRedemptionsPerCustomer: r.maxRedemptionsPerCustomer ?? r.max_redemptions_per_customer ?? null,
          validFrom: r.validFrom ?? r.valid_from ?? null,
          validUntil: r.validUntil ?? r.valid_until ?? null,
          termsAndConditions: r.termsAndConditions ?? r.terms_and_conditions ?? null,
          totalRedemptions: r.totalRedemptions ?? r.total_redemptions ?? 0,
          category: r.category ?? null,
          createdAt: r.createdAt ?? r.created_at ?? null,
          updatedAt: r.updatedAt ?? r.updated_at ?? null,
          raw: r,
        });
        setRewards(prev => prev.map(rr => (rr.id === r.id ? normalize(r) : rr)));
        setEditOpen(false);
        setSelectedReward(null);
        toast.success('Reward updated');
      }
    } catch (err) {
      console.error('Update reward failed', err);
      toast.error('Failed to update reward');
    }
  };

  return (
    <>
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Rewards Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage rewards catalog and fulfill customer redemptions</p>
        </div>
      </div>

      {/* Quick Verify */}
      <div ref={quickVerifyRef}>
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-600 rounded-lg">
                <QrCode className="size-5 sm:size-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Quick Redemption Verification</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Enter any redemption code to verify and fulfill</CardDescription>
              </div>
            </div>
            {pendingRedemptions.length > 0 && (
              <Badge className="bg-orange-500 text-white w-fit">
                <Clock className="size-3 mr-1" />
                {pendingRedemptions.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {!quickFulfillSuccess ? (
            !selectedRedemption ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter code (e.g., ACC123456)"
                      value={verifyCodeValue}
                      onChange={(e) => setVerifyCodeValue(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickVerify()}
                      className="font-mono text-center text-base sm:text-lg tracking-wider h-10 sm:h-12"
                    />
                  </div>
                  <div className="flex gap-2">
                  <Button
                    onClick={() => handleQuickVerify()}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 px-4 sm:px-8 h-10 sm:h-auto"
                    disabled={!verifyCodeValue || verifyProcessing}
                  >
                    <Scan className="size-4 sm:size-5 mr-2" />
                    {verifyProcessing ? 'Verifying...' : 'Verify'}
                  </Button>
                  <Dialog open={scanOpen} onOpenChange={(open) => { setScanOpen(open); if (open) { startScanner(); } }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50 h-10 sm:h-auto"
                        disabled={verifyProcessing}
                      >
                        <QrCode className="size-4 sm:size-5" />
                        <span className="hidden sm:inline ml-2">Scan QR</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Scan Redemption QR</DialogTitle>
                        <DialogDescription>Point the camera at the customer’s QR code to verify.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div className="relative overflow-hidden rounded-lg border bg-black">
                          <video ref={scanVideoRef} className="w-full aspect-video" autoPlay muted playsInline />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-44 w-44 border-2 border-emerald-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                              <div className="h-full w-full border border-emerald-300/40 rounded-xl"></div>
                            </div>
                          </div>
                          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                            <Button size="sm" variant="outline" onClick={startScanner} disabled={scanStarting}>
                              Enable camera
                            </Button>
                          </div>
                        </div>
                        {scanStarting && (
                          <p className="text-xs text-gray-600">Starting camera…</p>
                        )}
                        {!scanStarting && scanStatus && (
                          <p className="text-xs text-gray-600">{scanStatus}</p>
                        )}
                        {scanError && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                            <AlertCircle className="size-4 text-red-600" />
                            <p className="text-xs text-red-700">{scanError}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">Allow camera access when prompted.</p>
                        <p className="text-xs text-gray-500">Ensure the QR is well-lit and centered.</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>

                {quickVerifyError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="size-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{quickVerifyError}</p>
                  </div>
                )}

                {pendingRedemptions.length > 0 && (
                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-600">Pending codes available for verification.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-5 bg-white border-2 border-green-500 rounded-xl space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 text-green-700 pb-2 sm:pb-3 border-b border-green-200">
                    <CheckCircle2 className="size-5 sm:size-6" />
                    <span className="font-semibold text-base sm:text-lg">Valid Redemption Found</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="col-span-2 p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium mb-1">REWARD</p>
                      <p className="text-lg sm:text-xl font-semibold text-amber-900">{selectedRedemption.reward?.name || 'Reward'}</p>
                    </div>

                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Customer</p>
                      <p className="font-medium text-sm sm:text-base truncate">{selectedRedemption.customer?.name || 'Unknown'}</p>
                      <p className="text-xs sm:text-sm text-gray-500 font-mono truncate">{selectedRedemption.customer?.phone || '—'}</p>
                    </div>

                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Points Used</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">{selectedRedemption.pointsUsed}</p>
                    </div>

                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Requested</p>
                      <p className="text-xs sm:text-sm">{formatDateTime(selectedRedemption.createdAt)}</p>
                    </div>

                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Expires</p>
                      <p className="text-xs sm:text-sm text-orange-600 font-medium">
                        {formatDateTime(selectedRedemption.expiresAt || getExpiresAt(selectedRedemption.createdAt))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={handleQuickFulfill}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-10 sm:h-12 text-sm sm:text-base"
                    disabled={fulfillProcessing}
                  >
                    <CheckCircle2 className="size-4 sm:size-5 mr-2" />
                    {fulfillProcessing ? 'Processing...' : 'Approve & Mark Fulfilled'}
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-10 sm:h-12 text-sm sm:text-base"
                        disabled={cancelProcessing}
                      >
                        <XCircle className="size-4 sm:size-5 mr-2" />
                        Decline
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Decline Redemption</DialogTitle>
                        <DialogDescription>Select a reason for declining</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 pt-2 sm:pt-4">
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickCancel('Product out of stock')}>
                          Product out of stock
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickCancel('Customer not present')}>
                          Customer not present
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickCancel('Reward expired')}>
                          Reward expired
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickCancel('Other reason')}>
                          Other reason
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Button variant="ghost" onClick={handleQuickReset} className="w-full h-9 sm:h-10 text-sm">
                  ← Verify Another Code
                </Button>
              </div>
            )
          ) : (
            <div className="py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="size-12 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-green-900">Redemption Fulfilled!</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    The reward has been successfully marked as fulfilled
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto">
        <div className="flex gap-4 sm:gap-6 min-w-max">
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'redemptions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Redemptions
            <span className="ml-1 sm:ml-2 text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              {allRedemptions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'catalog'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Catalog
            <span className="ml-1 sm:ml-2 text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full">
              {rewards.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'catalog' && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-1">Rewards Catalog</h2>
          <p className="text-sm sm:text-base text-gray-600">Create and manage your customer reward offerings</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="size-4 mr-2" />
              Create Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Reward</DialogTitle>
              <DialogDescription>Set up a new reward for your loyalty program</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Reward Name <span className="text-current">*</span></label>
                  <Input maxLength={100} value={newReward.name} onChange={(e) => setNewReward(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Free Coffee (max 100 chars)" />
                  {createErrors.name ? <p className="text-sm text-red-600 mt-1">{createErrors.name}</p> : null}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea maxLength={500} value={newReward.description} onChange={(e) => setNewReward(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the reward..." rows={3} />
              </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Monetary Value ({getCurrencySymbol()})</label>
                  <Input 
                    type="number" 
                    value={newReward.monetaryValueMajor ?? ''} 
                    onChange={(e) => {
                      const v = e.target.value;
                      // user manually edited monetary -> stop auto monetary updates from points
                      setCreateAutoMonetary(false);
                      setNewReward(prev => ({ ...prev, monetaryValueMajor: v }));
                      if (createAutoPoints) {
                        const suggested = computeSuggestedPointsFromMajor(v);
                        setNewReward(prev => ({ ...prev, pointsRequired: suggested }));
                      }
                    }} 
                    placeholder={homeCurrency === 'NGN' ? '5000' : '5'}
                    step={homeCurrency === 'NGN' ? '100' : '0.01'}
                  />
                  {newReward.monetaryValueMajor && Number(newReward.monetaryValueMajor) > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mt-1">Suggested points: {computeSuggestedPointsFromMajor(newReward.monetaryValueMajor)} (1 point = {getCurrencySymbol()}{pointValue.toLocaleString(undefined, { minimumFractionDigits: homeCurrency === 'NGN' ? 0 : 2, maximumFractionDigits: homeCurrency === 'NGN' ? 0 : 2 })})</p>
                      {Number(newReward.monetaryValueMajor) < currencyValueFloor ? (
                        <p className="text-xs text-amber-600 mt-1">Minimum recommended value: {formatMajor(currencyValueFloor, homeCurrency || undefined)}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Reward value in your currency. 1 point = {getCurrencySymbol()}{pointValue.toLocaleString(undefined, { minimumFractionDigits: homeCurrency === 'NGN' ? 0 : 2, maximumFractionDigits: homeCurrency === 'NGN' ? 0 : 2 })}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Points Required <span className="text-current">*</span></label>
                  <Input type="number" value={newReward.pointsRequired ?? ''} onChange={(e) => {
                    const v = e.target.value;
                    // user manually edited points -> stop auto-points-from-monetary
                    setCreateAutoPoints(false);
                    // if auto-monetary is enabled, update monetary from points
                    if (createAutoMonetary) {
                      const suggestedMon = computeSuggestedMonetaryFromPoints(v);
                      setNewReward(prev => ({ ...prev, pointsRequired: v, monetaryValueMajor: suggestedMon.toString() }));
                    } else {
                      setNewReward(prev => ({ ...prev, pointsRequired: Number(v) }));
                    }
                  }} placeholder="100" />
                  {createErrors.pointsRequired ? <p className="text-sm text-red-600 mt-1">{createErrors.pointsRequired}</p> : null}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={newReward.category} onValueChange={(v) => setNewReward(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Stock Quantity</label>
                  <Input type="number" value={newReward.stockQuantity ?? ''} onChange={(e) => setNewReward(prev => ({ ...prev, stockQuantity: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="Leave empty for unlimited" />
                  {createErrors.stockQuantity ? <p className="text-sm text-red-600 mt-1">{createErrors.stockQuantity}</p> : null}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Redemptions Per Customer</label>
                <Input type="number" value={newReward.maxRedemptionsPerCustomer ?? ''} onChange={(e) => setNewReward(prev => ({ ...prev, maxRedemptionsPerCustomer: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="Leave empty for unlimited" />
                {createErrors.maxRedemptionsPerCustomer ? <p className="text-sm text-red-600 mt-1">{createErrors.maxRedemptionsPerCustomer}</p> : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid From</label>
                  <Input type="date" value={newReward.validFrom} onChange={(e) => setNewReward(prev => ({ ...prev, validFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid Until</label>
                  <Input type="date" value={newReward.validUntil} onChange={(e) => setNewReward(prev => ({ ...prev, validUntil: e.target.value }))} />
                  {createErrors.validUntil ? <p className="text-sm text-red-600 mt-1">{createErrors.validUntil}</p> : null}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Terms and Conditions</label>
                <Textarea maxLength={1000} value={newReward.termsAndConditions} onChange={(e) => setNewReward(prev => ({ ...prev, termsAndConditions: e.target.value }))} placeholder="Optional terms for redemption..." rows={3} />
              </div>
              
              <Button className="w-full" onClick={handleCreate}>Create Reward</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {activeTab === 'catalog' && (
      <>
      {/* Rewards Summary (moved above grid) */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards Summary</CardTitle>
          <CardDescription>Overview of your rewards program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Total Rewards</p>
              <p className="text-2xl font-semibold text-blue-700">{rewards.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Active Rewards</p>
              <p className="text-2xl font-semibold text-green-700">
                {rewards.filter(r => r.isActive).length}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-600 mb-1">Total Redemptions</p>
              <p className="text-2xl font-semibold text-amber-700">
                {rewards.reduce((sum, r) => sum + (r.total_redemptions ?? r.totalRedemptions ?? 0), 0)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 mb-1">Avg. Points Required</p>
              <p className="text-2xl font-semibold text-purple-700">
                {rewards.length ? Math.round(rewards.reduce((sum, r) => sum + (r.points_required ?? r.pointsRequired ?? 0), 0) / rewards.length) : 0} pts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div>Loading rewards...</div> : pagedRewards.map((reward) => (
          <Card key={reward.id} className="relative overflow-hidden">
            <CardHeader className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                  <Award className="size-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{reward.name}</CardTitle>
                  <CardDescription className="mt-1 truncate">{reward.description}</CardDescription>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0 flex flex-col items-end gap-2">
                {/* Active / Inactive */}
                {reward.isActive === false ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <Badge variant="outline">Active</Badge>
                )}

                {!!pendingCounts[reward.id] && (
                  <Badge variant="secondary">{pendingCounts[reward.id]} pending</Badge>
                )}

                {/* Stock state badges */}
                {((reward.stockQuantity ?? reward.stock_quantity) != null) && (() => {
                  const qty = reward.stockQuantity ?? reward.stock_quantity;
                  if (qty === 0) return <Badge variant="destructive">Out of stock</Badge>;
                  if (qty <= 5) return <Badge variant="destructive">Low stock: {qty}</Badge>;
                  return null;
                })()}

                {/* New badge for recently added rewards (7 days) */}
                {reward.createdAt && (() => {
                  try {
                    const created = new Date(reward.createdAt);
                    const diff = Date.now() - created.getTime();
                    if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) return <Badge variant="secondary">New</Badge>;
                  } catch (e) {}
                  return null;
                })()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Points Required */}
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-amber-600" />
                    <span className="text-sm text-amber-900">Points Required</span>
                  </div>
                  <span className="font-semibold text-amber-700">{reward.pointsRequired ?? reward.points_required} pts</span>
                </div>

                {/* Value */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monetary Value</span>
                  <span className="font-medium">{formatNGN(reward.monetaryValueNgn ?? reward.monetary_value_ngn)}</span>
                </div>

                {/* Category */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Category</span>
                  <Badge variant="outline">{reward.category}</Badge>
                </div>

                {/* Stock */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock</span>
                  <div className="flex items-center gap-1">
                    <Package className="size-3 text-gray-400" />
                    <span className="text-sm font-medium">
                      {(() => {
                        const qty = reward.stockQuantity ?? reward.stock_quantity;
                        return qty == null ? 'Unlimited' : `${qty} left`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Redemptions */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Redemptions</span>
                  <span className="font-medium text-green-600">{reward.totalRedemptions ?? reward.total_redemptions}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Dialog>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(reward)}>
                        <Edit className="size-4 mr-1" />
                        Edit
                      </Button>
                  </Dialog>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setToDelete(reward); setDeleteOpen(true); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!loading && rewards.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-gray-500">
            {rewards.length} total • Page {rewardsPage} of {rewardsPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRewardsPage(Math.max(1, rewardsPage - 1))}
              disabled={rewardsPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRewardsPage(Math.min(rewardsPages, rewardsPage + 1))}
              disabled={rewardsPage >= rewardsPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      </>
      )}

      {/* All Redemptions Section */}
      {activeTab === 'redemptions' && (
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Total</p>
              <p className="text-lg sm:text-2xl font-semibold">{redemptionStats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-2 sm:p-4">
              <p className="text-xs sm:text-sm text-orange-600 mb-0.5 sm:mb-1">Pending</p>
              <p className="text-lg sm:text-2xl font-semibold text-orange-700">{redemptionStats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-2 sm:p-4">
              <p className="text-xs sm:text-sm text-green-600 mb-0.5 sm:mb-1">Fulfilled</p>
              <p className="text-lg sm:text-2xl font-semibold text-green-700">{redemptionStats.fulfilled}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-2 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600 mb-0.5 sm:mb-1">Cancelled</p>
              <p className="text-lg sm:text-2xl font-semibold text-red-700">{redemptionStats.cancelled}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50 col-span-2 sm:col-span-1">
            <CardContent className="p-2 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Expired</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-700">{redemptionStats.expired}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Search customer, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
                <Button variant="outline" size="sm" onClick={loadAllRedemptions} disabled={allLoading} className="flex-1 sm:flex-none">
                  {allLoading ? 'Loading...' : 'Refresh'}
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="size-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redemptions List */}
        <div className="space-y-3">
          {allLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Loading redemptions...</p>
              </CardContent>
            </Card>
          ) : filteredRedemptions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="size-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No redemptions found</p>
              </CardContent>
            </Card>
          ) : (
            <>
            {/* Desktop Table - hidden on mobile */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Fulfilled</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRedemptions.map((redemption: any) => (
                        <TableRow key={redemption.id} className="hover:bg-gray-50">
                          <TableCell>
                            {redemption.status === 'fulfilled' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle2 className="size-3 mr-1" />
                                Fulfilled
                              </Badge>
                            )}
                            {redemption.status === 'pending' && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                <Clock className="size-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {redemption.status === 'cancelled' && (
                              <Badge variant="outline" className="text-red-600 border-red-200">
                                <XCircle className="size-3 mr-1" />
                                Cancelled
                              </Badge>
                            )}
                            {redemption.status === 'expired' && (
                              <Badge variant="outline" className="text-gray-600">
                                <AlertCircle className="size-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {['pending'].includes(redemption.status) ? (
                              <button
                                type="button"
                                className="font-mono text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                                onClick={() => {
                                  setVerifyCodeValue((redemption.redemptionCode || '').toUpperCase());
                                  setSelectedRedemption(null);
                                  setQuickVerifyError('');
                                  setQuickFulfillSuccess(false);
                                  quickVerifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                              >
                                {redemption.redemptionCode}
                              </button>
                            ) : (
                              <span className="font-mono text-sm font-medium">{redemption.redemptionCode}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{redemption.reward?.name || '—'}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{redemption.customer?.name || '—'}</p>
                              <p className="text-sm text-gray-500 font-mono">{redemption.customer?.phone || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-amber-600">{redemption.pointsUsed}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDateTime(redemption.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            {redemption.fulfilledAt ? (
                              <div>
                                <p className="text-sm text-green-600">{formatDateTime(redemption.fulfilledAt)}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {redemption.cancelledReason && (
                              <p className="text-xs text-red-600">{redemption.cancelledReason}</p>
                            )}
                            {redemption.status === 'pending' && (
                              <p className="text-xs text-orange-600">
                                Expires: {formatDateTime(redemption.expiresAt || getExpiresAt(redemption.createdAt))}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Card View - shown only on mobile */}
            <div className="md:hidden space-y-3">
              {pagedRedemptions.map((redemption: any) => (
                <Card key={redemption.id} className="p-3">
                  <div className="space-y-3">
                    {/* Header: Status + Code */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {['pending'].includes(redemption.status) ? (
                          <button
                            type="button"
                            className="font-mono text-sm font-bold text-blue-600 hover:underline"
                            onClick={() => {
                              setVerifyCodeValue((redemption.redemptionCode || '').toUpperCase());
                              setSelectedRedemption(null);
                              setQuickVerifyError('');
                              setQuickFulfillSuccess(false);
                              quickVerifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                          >
                            {redemption.redemptionCode}
                          </button>
                        ) : (
                          <span className="font-mono text-sm font-bold">{redemption.redemptionCode}</span>
                        )}
                        <p className="text-sm text-gray-700 mt-0.5">{redemption.reward?.name || '—'}</p>
                      </div>
                      <div className="shrink-0">
                        {redemption.status === 'fulfilled' && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            <CheckCircle2 className="size-3 mr-1" />
                            Fulfilled
                          </Badge>
                        )}
                        {redemption.status === 'pending' && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                            <Clock className="size-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {redemption.status === 'cancelled' && (
                          <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                            <XCircle className="size-3 mr-1" />
                            Cancelled
                          </Badge>
                        )}
                        {redemption.status === 'expired' && (
                          <Badge variant="outline" className="text-gray-600 text-xs">
                            <AlertCircle className="size-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Customer + Points row */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{redemption.customer?.name || '—'}</p>
                        <p className="text-xs text-gray-500 font-mono">{redemption.customer?.phone || '—'}</p>
                      </div>
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 shrink-0">
                        {redemption.pointsUsed} pts
                      </Badge>
                    </div>

                    {/* Dates row */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Requested: {formatDateTime(redemption.createdAt)}</span>
                      {redemption.fulfilledAt && (
                        <span className="text-green-600">✓ {formatDateTime(redemption.fulfilledAt)}</span>
                      )}
                    </div>

                    {/* Extra info */}
                    {redemption.cancelledReason && (
                      <p className="text-xs text-red-600">Reason: {redemption.cancelledReason}</p>
                    )}
                    {redemption.status === 'pending' && (
                      <p className="text-xs text-orange-600">
                        Expires: {formatDateTime(redemption.expiresAt || getExpiresAt(redemption.createdAt))}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-gray-500 order-2 sm:order-1">
                {filteredRedemptions.length} total • Page {redemptionsPage} of {redemptionsPages}
              </p>
              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRedemptionsPage(Math.max(1, redemptionsPage - 1))}
                  disabled={redemptionsPage <= 1}
                  className="flex-1 sm:flex-none"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRedemptionsPage(Math.min(redemptionsPages, redemptionsPage + 1))}
                  disabled={redemptionsPage >= redemptionsPages}
                  className="flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* (Summary moved above grid) */}
    </div>

    {/* Verification Dialog */}
    <Dialog open={verifyOpen} onOpenChange={(open) => { if (!open) { setSelectedRedemption(null); setFulfillNotes(''); } setVerifyOpen(open); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Redemption</DialogTitle>
          <DialogDescription>Process customer redemption code</DialogDescription>
        </DialogHeader>
        {selectedRedemption && (
          <div className="space-y-4 pt-4">
            {/* Code */}
            <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-600 mb-1">Redemption Code</p>
                <p className="font-mono font-bold text-lg break-all">{selectedRedemption.redemptionCode || selectedRedemption.redemption_code || 'N/A'}</p>
              </div>

            {/* Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Customer</p>
                <p className="text-sm font-medium">{selectedRedemption.customer?.name || selectedRedemption.customerName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <Badge variant={selectedRedemption.status === 'verified' ? 'default' : 'outline'}>
                  {selectedRedemption.status || 'pending'}
                </Badge>
              </div>
            </div>

            {/* Reward */}
            <div>
              <p className="text-xs text-gray-600 mb-1">Reward</p>
              <p className="text-sm font-medium">{selectedRedemption.reward?.name || selectedRedemption.rewardName || 'Unknown'}</p>
            </div>

            {/* Fulfill Notes */}
            {selectedRedemption.status === 'verified' && (
              <div>
                <label className="text-sm font-medium mb-1 block">Fulfillment Notes (Optional)</label>
                <Textarea value={fulfillNotes} onChange={(e) => setFulfillNotes(e.target.value)} placeholder="e.g., Item serial number, delivery tracking, etc." rows={3} />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {selectedRedemption.status === 'pending' && (
                <Button 
                  className="w-full" 
                  onClick={async () => {
                    try {
                      setVerifyProcessing(true);
                      const res = await apiClient.post('/redemptions/verify', {
                        redemptionCode: selectedRedemption.redemptionCode || selectedRedemption.redemption_code
                      });
                      if (res && res.data) {
                        const normalized = normalizeRedemption(res.data.data || res.data);
                        setSelectedRedemption((prev: any) => normalizeRedemption({ ...(prev || {}), ...(normalized || {}) }));
                        toast.success('Code verified successfully');
                        loadAllRedemptions();
                      }
                    } catch (err) {
                      const msg = err?.response?.data?.error || err?.message || 'Verification failed';
                      toast.error(msg);
                    } finally {
                      setVerifyProcessing(false);
                    }
                  }}
                  disabled={verifyProcessing}
                >
                  {verifyProcessing ? 'Verifying...' : 'Verify Code'}
                </Button>
              )}

              {selectedRedemption.status === 'verified' && (
                <Button 
                  className="w-full"
                  onClick={async () => {
                    try {
                      setFulfillProcessing(true);
                      const res = await apiClient.post(`/redemptions/${selectedRedemption.id}/fulfill`, {
                        notes: fulfillNotes
                      });
                      if (res && res.data) {
                        setSelectedRedemption((prev: any) => normalizeRedemption({ ...(prev || {}), ...(res.data.data || res.data || {}) }));
                        toast.success('Redemption fulfilled');
                        // Reload pending list
                        loadPendingRedemptions();
                        loadAllRedemptions();
                        setTimeout(() => setVerifyOpen(false), 500);
                      }
                    } catch (err) {
                      const msg = err?.response?.data?.error || err?.message || 'Fulfillment failed';
                      toast.error(msg);
                    } finally {
                      setFulfillProcessing(false);
                    }
                  }}
                  disabled={fulfillProcessing}
                >
                  {fulfillProcessing ? 'Processing...' : 'Mark as Fulfilled'}
                </Button>
              )}

              <Button 
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  if (!confirm('Cancel redemption and refund points to customer?')) return;
                  try {
                    setCancelProcessing(true);
                    const res = await apiClient.post(`/redemptions/${selectedRedemption.id}/cancel`, {});
                    if (res && res.data) {
                      toast.success('Redemption cancelled and points refunded');
                      loadPendingRedemptions();
                      loadAllRedemptions();
                      setTimeout(() => setVerifyOpen(false), 500);
                    }
                  } catch (err) {
                    const msg = err?.response?.data?.error || err?.message || 'Cancellation failed';
                    toast.error(msg);
                  } finally {
                    setCancelProcessing(false);
                  }
                }}
                disabled={cancelProcessing}
              >
                {cancelProcessing ? 'Processing...' : 'Cancel & Refund'}
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setVerifyOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Verify Code Dialog */}
    <Dialog open={verifyCodeOpen} onOpenChange={(open) => { if (!open) setVerifyCodeValue(''); setVerifyCodeOpen(open); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Redemption Code</DialogTitle>
          <DialogDescription>Enter a code from the customer</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Redemption Code</label>
            <Input
              value={verifyCodeValue}
              onChange={(e) => setVerifyCodeValue(e.target.value.toUpperCase())}
              placeholder="Enter code"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={async () => {
                if (!verifyCodeValue.trim()) {
                  toast.error('Please enter a code');
                  return;
                }
                try {
                  setVerifyProcessing(true);
                  const res = await apiClient.post('/redemptions/verify', {
                    redemptionCode: verifyCodeValue.trim()
                  });
                  if (res && res.data) {
                    const normalized = normalizeRedemption(res.data.data || res.data);
                    setSelectedRedemption(normalized);
                    setFulfillNotes('');
                    setVerifyCodeOpen(false);
                    setVerifyOpen(true);
                    loadPendingRedemptions();
                    loadAllRedemptions();
                    toast.success('Code verified successfully');
                  }
                } catch (err) {
                  const msg = err?.response?.data?.error || err?.message || 'Verification failed';
                  toast.error(msg);
                } finally {
                  setVerifyProcessing(false);
                }
              }}
              disabled={verifyProcessing}
            >
              {verifyProcessing ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button variant="ghost" onClick={() => setVerifyCodeOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Edit Dialog (single, controlled) */}
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reward</DialogTitle>
          <DialogDescription>Update reward details</DialogDescription>
        </DialogHeader>
        {selectedReward ? (
            <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Reward Name <span className="text-current">*</span></label>
              <Input maxLength={100} value={selectedReward.name} onChange={(e) => setSelectedReward((s:any) => ({ ...s, name: e.target.value }))} placeholder="Up to 100 characters" />
              {editErrors.name ? <p className="text-sm text-red-600 mt-1">{editErrors.name}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={selectedReward.description} onChange={(e) => setSelectedReward((s:any) => ({ ...s, description: e.target.value }))} placeholder="Describe the reward..." rows={3} maxLength={500} />
            </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Monetary Value ({getCurrencySymbol()})</label>
                  <Input type="number" value={selectedReward.monetaryValueMajor ?? ''} onChange={(e) => {
                    const v = e.target.value;
                    // manual monetary edit -> disable auto monetary-from-points
                    setEditAutoMonetary(false);
                    setSelectedReward((s:any) => ({ ...s, monetaryValueMajor: v }));
                    if (editAutoPoints) {
                      const suggested = computeSuggestedPointsFromMajor(v);
                      setSelectedReward((s:any) => ({ ...s, pointsRequired: suggested }));
                    }
                  }} />
                  {selectedReward.monetaryValueMajor && Number(selectedReward.monetaryValueMajor) > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mt-1">Suggested points: {computeSuggestedPointsFromMajor(selectedReward.monetaryValueMajor)} (1 point = {getCurrencySymbol()}{pointValue.toLocaleString(undefined, { minimumFractionDigits: homeCurrency === 'NGN' ? 0 : 2, maximumFractionDigits: homeCurrency === 'NGN' ? 0 : 2 })})</p>
                      {Number(selectedReward.monetaryValueMajor) < currencyValueFloor ? (
                        <p className="text-xs text-amber-600 mt-1">Minimum recommended value: {formatMajor(currencyValueFloor, homeCurrency || undefined)}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">1 point = {getCurrencySymbol()}{pointValue.toLocaleString(undefined, { minimumFractionDigits: homeCurrency === 'NGN' ? 0 : 2, maximumFractionDigits: homeCurrency === 'NGN' ? 0 : 2 })}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Points Required <span className="text-current">*</span></label>
                  <Input type="number" value={selectedReward.pointsRequired} onChange={(e) => {
                    const v = e.target.value;
                    // manual points edit -> disable auto points-from-monetary
                    setEditAutoPoints(false);
                    if (editAutoMonetary) {
                      const suggestedMon = computeSuggestedMonetaryFromPoints(v);
                      setSelectedReward((s:any) => ({ ...s, pointsRequired: Number(v), monetaryValueMajor: suggestedMon }));
                    } else {
                      setSelectedReward((s:any) => ({ ...s, pointsRequired: Number(v) }));
                    }
                  }} />
                  {editErrors.pointsRequired ? <p className="text-sm text-red-600 mt-1">{editErrors.pointsRequired}</p> : null}
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={selectedReward.category} onValueChange={(v) => setSelectedReward((s:any) => ({ ...s, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Stock Quantity</label>
                <Input type="number" placeholder="Leave empty for unlimited" value={selectedReward.stockQuantity ?? ''} onChange={(e) => setSelectedReward((s:any) => ({ ...s, stockQuantity: e.target.value === '' ? null : Number(e.target.value) }))} />
                {editErrors.stockQuantity ? <p className="text-sm text-red-600 mt-1">{editErrors.stockQuantity}</p> : null}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Redemptions Per Customer</label>
              <Input type="number" placeholder="Leave empty for unlimited" value={selectedReward.maxRedemptionsPerCustomer ?? ''} onChange={(e) => setSelectedReward((s:any) => ({ ...s, maxRedemptionsPerCustomer: e.target.value === '' ? null : Number(e.target.value) }))} />
              {editErrors.maxRedemptionsPerCustomer ? <p className="text-sm text-red-600 mt-1">{editErrors.maxRedemptionsPerCustomer}</p> : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Valid From</label>
                <Input type="date" value={selectedReward.validFrom ?? ''} onChange={(e) => setSelectedReward((s:any) => ({ ...s, validFrom: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Valid Until</label>
                <Input type="date" value={selectedReward.validUntil ?? ''} onChange={(e) => setSelectedReward((s:any) => ({ ...s, validUntil: e.target.value }))} />
                {editErrors.validUntil ? <p className="text-sm text-red-600 mt-1">{editErrors.validUntil}</p> : null}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Terms and Conditions</label>
              <Textarea value={selectedReward.termsAndConditions ?? ''} onChange={(e) => setSelectedReward((s:any) => ({ ...s, termsAndConditions: e.target.value }))} placeholder="Optional terms for redemption..." rows={3} maxLength={1000} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-gray-500">Enable or disable this reward</p>
              </div>
              <Switch checked={!!selectedReward.isActive} onCheckedChange={(v:any) => setSelectedReward((s:any) => ({ ...s, isActive: !!v }))} />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => { setEditOpen(false); setSelectedReward(null); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setToDelete(null); } setDeleteOpen(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Reward</DialogTitle>
          <DialogDescription>Are you sure you want to delete this reward? This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <p className="mb-4">{toDelete ? `Delete: ${toDelete.name}` : 'Delete selected reward'}</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setDeleteOpen(false); setToDelete(null); }}>Cancel</Button>
            <Button className="flex-1" variant="destructive" onClick={async () => {
              if (!toDelete) return;
              try {
                await apiClient.request(`/rewards/${toDelete.id}`, { method: 'DELETE' });
                setRewards(prev => prev.filter(r => r.id !== toDelete.id));
                setDeleteOpen(false);
                setToDelete(null);
                toast.success('Reward deleted');
              } catch (err) {
                console.error('Delete failed', err);
                toast.error('Failed to delete reward');
              }
            }}>Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
