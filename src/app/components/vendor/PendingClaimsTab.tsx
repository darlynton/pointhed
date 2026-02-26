import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatNGN, formatDate } from '../../../lib/mockData';
import { apiClient } from '../../../lib/api';
import { AlertTriangle, CheckCircle, XCircle, User, Calendar, DollarSign, FileText, Flag, TrendingUp, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

export function PendingClaimsTab() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsPages, setClaimsPages] = useState(1);
  const claimsLimit = 10;
  
  // Track the current request to prevent race conditions
  const currentRequestRef = useRef<string>('');

  const fetchClaims = async () => {
    // Generate a unique ID for this request
    const requestId = `${statusFilter}-${page}-${Date.now()}`;
    currentRequestRef.current = requestId;
    
    try {
      setLoading(true);
      // Clear existing claims immediately when switching tabs to prevent stale data display
      setClaims([]);
      const response = await apiClient.getClaims({ status: statusFilter, page, limit: claimsLimit });
      
      // Only update state if this is still the current request
      if (currentRequestRef.current === requestId) {
        setClaims(response.data || []);
        setClaimsTotal(response.pagination?.total || 0);
        setClaimsPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      // Only show error and clear if this is still the current request
      if (currentRequestRef.current === requestId) {
        toast.error('Failed to load transaction claims');
        setClaims([]);
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, page]);

  const handleReview = async () => {
    if (!selectedClaim) return;

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      
      // Optimistically remove the claim from the current view
      setClaims(prevClaims => prevClaims.filter(c => c.id !== selectedClaim.id));
      
      await apiClient.reviewClaim(
        selectedClaim.id,
        reviewAction,
        reviewAction === 'reject' ? rejectionReason : undefined
      );

      toast.success(
        reviewAction === 'approve' 
          ? 'Transaction claim approved! Customer has been notified.' 
          : 'Transaction claim rejected. Customer has been notified.'
      );

      setReviewDialogOpen(false);
      setSelectedClaim(null);
      setRejectionReason('');
      
      // Refresh the list to ensure consistency
      fetchClaims();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${reviewAction} transaction claim`);
      // If failed, refetch to restore the claim
      fetchClaims();
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (claim: any, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setReviewAction(action);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'high_amount': return 'text-red-600 bg-red-50';
      case 'new_customer': return 'text-amber-600 bg-amber-50';
      case 'no_receipt': return 'text-orange-600 bg-orange-50';
      case 'high_rejection_rate': return 'text-red-600 bg-red-50';
      case 'repeated_amount': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getFlagLabel = (flag: string) => {
    switch (flag) {
      case 'high_amount': return 'High Amount';
      case 'new_customer': return 'New Customer';
      case 'no_receipt': return 'No Receipt';
      case 'high_rejection_rate': return 'High Rejection Rate';
      case 'repeated_amount': return 'Repeated Amount';
      default: return flag;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'physical_store': return 'Physical Store';
      case 'online': return 'Online';
      case 'social_media': return 'Social Media';
      case 'other': return 'Other';
      default: return channel;
    }
  };

  const pendingCount = claims.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Transaction Claims</h2>
          <p className="text-gray-600">Review and approve customer transaction claims</p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Badge variant="default" className="text-sm px-3 py-1">
              {pendingCount} Pending
            </Badge>
          )}
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="size-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No {statusFilter} claims found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className={`border rounded-lg p-4 ${
                    claim.fraudFlags?.length > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header with customer info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="size-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {claim.customer.firstName || claim.customer.whatsappName} {claim.customer.lastName || ''}
                            </h3>
                            <p className="text-sm text-gray-600">{claim.customer.phoneNumber}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={claim.customer.loyaltyStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {claim.customer.loyaltyStatus}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {claim.customer.totalPurchases} transactions
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-amber-600 font-medium">
                                {claim.customer.pointsBalance?.currentBalance || 0} pts
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status badge */}
                        <Badge 
                          variant={
                            claim.status === 'approved' ? 'default' : 
                            claim.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {claim.status}
                        </Badge>
                      </div>

                      {/* Fraud flags */}
                      {claim.fraudFlags && claim.fraudFlags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Flag className="size-4 text-amber-600" />
                          {claim.fraudFlags.map((flag: string) => (
                            <Badge key={flag} className={`text-xs ${getFlagColor(flag)}`}>
                              {getFlagLabel(flag)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Claim details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-lg p-3 border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <DollarSign className="size-3" />
                            <span>Amount</span>
                          </div>
                          <p className="font-semibold text-lg">{formatNGN(claim.amountNgn)}</p>
                          <p className="text-xs text-green-600">
                            {Math.floor(claim.amountNgn / 100)} points
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <Calendar className="size-3" />
                            <span>Transaction Date</span>
                          </div>
                          <p className="font-medium">{formatDate(claim.purchaseDate)}</p>
                          <p className="text-xs text-gray-500">
                            Submitted {formatDate(claim.createdAt)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <FileText className="size-3" />
                            <span>Channel</span>
                          </div>
                          <p className="font-medium">{getChannelLabel(claim.channel)}</p>
                          <p className="text-xs text-gray-500">
                            {claim.receiptUrl ? '✓ Receipt uploaded' : '✗ No receipt'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <TrendingUp className="size-3" />
                            <span>History</span>
                          </div>
                          <p className="font-medium">
                            {claim.metadata?.approvalCount || 0} transaction claims
                          </p>
                          <p className="text-xs text-gray-500">
                            {claim.metadata?.rejectionRate || 0}% rejected
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {claim.description && (
                        <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                          <span className="font-medium">Note: </span>
                          {claim.description}
                        </div>
                      )}

                      {/* Rejection reason (if rejected) */}
                      {claim.status === 'rejected' && claim.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                          <span className="font-medium">Rejection Reason: </span>
                          {claim.rejectionReason}
                        </div>
                      )}

                      {/* Expiry warning for pending claims */}
                      {claim.status === 'pending' && claim.expiresAt && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="size-3" />
                          <span>Expires: {formatDate(claim.expiresAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {claim.status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => openReviewDialog(claim, 'approve')}
                      >
                        <CheckCircle className="size-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => openReviewDialog(claim, 'reject')}
                      >
                        <XCircle className="size-4 mr-2" />
                        Reject
                      </Button>
                      {claim.receiptUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReceiptUrl(claim.receiptUrl);
                            setReceiptModalOpen(true);
                          }}
                        >
                          View Receipt
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!loading && claims.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-gray-500">
                {claimsTotal} total • Page {page} of {claimsPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(claimsPages, page + 1))}
                  disabled={page >= claimsPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Transaction Claim' : 'Reject Transaction Claim'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Customer will receive points and a WhatsApp notification.'
                : 'Customer will be notified via WhatsApp with your reason.'}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 pt-4">
              {/* Claim summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {selectedClaim.customer.firstName || selectedClaim.customer.whatsappName} {selectedClaim.customer.lastName || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-semibold">{formatNGN(selectedClaim.amountNgn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Points to Award:</span>
                  <span className="font-semibold text-green-600">
                    {Math.floor(selectedClaim.amountNgn / 100)} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New Balance:</span>
                  <span className="font-semibold">
                    {(selectedClaim.customer.pointsBalance?.currentBalance || 0) + Math.floor(selectedClaim.amountNgn / 100)} points
                  </span>
                </div>
              </div>

              {/* Warning for flagged claims */}
              {reviewAction === 'approve' && selectedClaim.fraudFlags?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Fraud Flags Detected</p>
                    <p className="text-amber-700 mt-1">
                      {selectedClaim.fraudFlags.map((f: string) => getFlagLabel(f)).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Rejection reason input */}
              {reviewAction === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Rejection *</label>
                  <Textarea
                    placeholder="e.g., Receipt doesn't match amount, Duplicate claim, etc."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  variant={reviewAction === 'approve' ? 'default' : 'destructive'}
                  onClick={handleReview}
                  disabled={submitting || (reviewAction === 'reject' && !rejectionReason.trim())}
                >
                  {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve & Notify' : 'Reject & Notify'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Image Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
            <DialogDescription>
              Transaction receipt
            </DialogDescription>
          </DialogHeader>
          {selectedReceiptUrl && (
            <div className="flex flex-col items-center gap-4">
              <img 
                src={selectedReceiptUrl} 
                alt="Receipt" 
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'Failed to load receipt image';
                  e.currentTarget.className = 'text-red-500 p-4';
                }}
              />
              <Button
                variant="outline"
                onClick={() => window.open(selectedReceiptUrl, '_blank')}
              >
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
