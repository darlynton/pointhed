import prisma from '../utils/prisma.js';
import { sendWhatsAppMessage, sendTemplateMessage, downloadWhatsAppMedia } from '../services/whatsapp.service.js';
import { sendNewClaimNotification } from '../services/email.service.js';
import formatCurrency from '../utils/formatCurrency.js';
import { calculatePointsEarnedFromMinor } from '../config/loyaltyConstants.js';

// Submit a transaction claim (customer-initiated via WhatsApp Flow)
export const submitClaim = async (req, res) => {
  try {
    console.log('📥 Received claim submission:', JSON.stringify(req.body, null, 2));

    // Handle WhatsApp Flow format vs direct API format
    let phoneNumber, amountNgn, purchaseDate, channel, receiptUrl, description, vendorCode;

    // Check if this is a WhatsApp Flow submission (has flow_token or screen data)
    if (req.body.flow_token || req.body.screen) {
      // WhatsApp Flow format - all fields at top level
      const flowToken = req.body.flow_token;
      
      // Extract vendor code from flow_token (format: "8QDERH" or "claim_8QDERH_timestamp")
      if (flowToken) {
        vendorCode = flowToken.split('_')[0]; // Gets "8QDERH"
      }
      
      phoneNumber = req.body.from || req.body.phoneNumber;
      // Flow may submit `amount` (user-entered, major units) or `amountNgn` (minor units)
      // Prefer `amountNgn` if present (already minor); otherwise keep `amount` and convert later after tenant lookup
      amountNgn = req.body.amountNgn ?? req.body.amount;
      purchaseDate = req.body.purchase_date || req.body.purchaseDate;
      channel = req.body.channel;
      
      // Handle receipt - WhatsApp sends it as an object/array with metadata
      let rawReceipt = req.body.receipt || req.body.receipt_url || req.body.receiptUrl;
      if (rawReceipt) {
        // If it's an array, take the first item
        if (Array.isArray(rawReceipt)) {
          rawReceipt = rawReceipt[0];
        }
        // If it's an object with WhatsApp media ID, download the actual file
        if (typeof rawReceipt === 'object' && rawReceipt.id) {
          console.log('📥 Downloading receipt from WhatsApp:', rawReceipt);
          receiptUrl = await downloadWhatsAppMedia(rawReceipt);
          if (!receiptUrl) {
            console.warn('⚠️  Failed to download receipt, storing metadata as fallback');
            receiptUrl = JSON.stringify(rawReceipt);
          }
        } else if (typeof rawReceipt === 'object') {
          // Object without id - just stringify as fallback
          receiptUrl = JSON.stringify(rawReceipt);
        } else {
          // Already a string URL
          receiptUrl = rawReceipt;
        }
      }
      
      description = req.body.description || req.body.notes;
    } else {
      // Direct API format
      ({ phoneNumber, amountNgn, purchaseDate, channel, receiptUrl, description, vendorCode } = req.body);
    }

    console.log('📋 Parsed claim data:', { phoneNumber, amountNgn, purchaseDate, channel, vendorCode });

    // Validation
    if (!phoneNumber || !amountNgn || !purchaseDate || !vendorCode) {
      return res.status(400).json({ 
        error: 'Phone number, amount, transaction date, and vendor code are required',
        received: { phoneNumber, amountNgn, purchaseDate, vendorCode }
      });
    }

    if (amountNgn <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Find tenant by vendor code (include homeCurrency)
    const tenant = await prisma.tenant.findUnique({
      where: { vendorCode },
      select: { 
        id: true, 
        businessName: true,
        settings: true,
        homeCurrency: true
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if customer is registered with this vendor
    // Try multiple phone number formats to handle variations
    const phoneVariants = [
      phoneNumber,
      phoneNumber.replace(/^\+/, ''),
      phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates

    console.log('📋 Looking up customer with phone variants:', phoneVariants);

    const customer = await prisma.customer.findFirst({
      where: {
        phoneNumber: { in: phoneVariants },
        tenantId: tenant.id,
        deletedAt: null
      },
      include: {
        pointsBalance: true
      }
    });

    if (!customer) {
      console.log(`❌ Customer not found for phone variants: ${phoneVariants.join(', ')}, tenant: ${tenant.id}`);
      
      // Customer not registered - send WhatsApp rejection
      await sendWhatsAppMessage({
        phoneNumber,
        message: `❌ Not Registered\n\nYou need to be registered with ${tenant.businessName} to claim points.\n\nPlease visit them in-store or contact them to join their loyalty program!`
      }).catch(err => console.error('Failed to send rejection message:', err));

      return res.status(403).json({ 
        error: 'Customer not registered with this business' 
      });
    }

    console.log(`✅ Found customer: ${customer.id} (${customer.firstName} ${customer.lastName})`);

    // Check if customer is blocked
    if (customer.loyaltyStatus === 'blocked') {
      await sendWhatsAppMessage({
        phoneNumber,
        message: `❌ Account Blocked\n\nYour account with ${tenant.businessName} is currently blocked. Please contact them for assistance.`
      }).catch(err => console.error('Failed to send blocked message:', err));

      return res.status(403).json({ 
        error: 'Customer account is blocked' 
      });
    }

    // Validate purchase date
    const purchaseDateObj = new Date(purchaseDate);
    if (isNaN(purchaseDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid transaction date' });
    }

    // Prevent future dates
    if (purchaseDateObj > new Date()) {
      return res.status(400).json({ error: 'Transaction date cannot be in the future' });
    }

    // Prevent claims older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (purchaseDateObj < sevenDaysAgo) {
      await sendWhatsAppMessage({
        phoneNumber,
        message: `⚠️ Claim Expired\n\nTransaction claims must be submitted within 7 days.\n\nThis transaction from ${purchaseDateObj.toLocaleDateString()} is too old to claim.\n\n- ${tenant.businessName}`
      }).catch(err => console.error('Failed to send expired message:', err));

      return res.status(400).json({ 
        error: 'Claims must be submitted within 7 days of the transaction' 
      });
    }

    // Rate limiting: Check claims today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const claimsToday = await prisma.purchaseClaim.count({
      where: {
        customerId: customer.id,
        createdAt: {
          gte: today
        }
      }
    });

    if (claimsToday >= 3) {
      await sendWhatsAppMessage({
        phoneNumber,
        message: `⚠️ Daily Limit Reached\n\nYou can only submit 3 transaction claims per day.\n\nPlease try again tomorrow.\n\n- ${tenant.businessName}`
      }).catch(err => console.error('Failed to send rate limit message:', err));

      return res.status(429).json({ 
        error: 'Daily transaction claim limit reached (3 per day)' 
      });
    }

    // Duplicate claim detection: Check for same amount+date+channel within last 30 minutes
    const duplicateWindow = new Date();
    duplicateWindow.setMinutes(duplicateWindow.getMinutes() - 30);
    
    const existingDuplicate = await prisma.purchaseClaim.findFirst({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        amountNgn: parseFloat(amountNgn),
        purchaseDate: purchaseDateObj,
        channel: channel || 'physical_store',
        createdAt: { gte: duplicateWindow }
      }
    });

    if (existingDuplicate) {
      await sendWhatsAppMessage({
        phoneNumber,
        message: `⚠️ Duplicate Claim Detected\n\nA similar claim was already submitted:\n💰 Amount: same\n📅 Date: ${purchaseDateObj.toLocaleDateString()}\n📍 Channel: ${channel || 'physical_store'}\n\nIf this is a different transaction, please wait 30 minutes or contact ${tenant.businessName} directly.\n\n- ${tenant.businessName}`
      }).catch(err => console.error('Failed to send duplicate message:', err));

      return res.status(409).json({ 
        error: 'A similar claim was already submitted recently. Please wait or contact the business.' 
      });
    }

    // If this came from Flow and `amount` was provided (not amountNgn), convert major -> minor
    if ((req.body.flow_token || req.body.screen || req.body.data) && req.body.data) {
      const flowData = req.body.data || req.body;
      if (flowData.amount !== undefined && flowData.amountNgn === undefined) {
        // All supported currencies have 100 minor units
        const minorScale = 100;
        amountNgn = Math.round(Number(flowData.amount) * minorScale);
      }
    }

    // Create purchase claim
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

    const claim = await prisma.purchaseClaim.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        phoneNumber,
        amountNgn: parseFloat(amountNgn),
        purchaseDate: purchaseDateObj,
        channel: channel || 'physical_store',
        receiptUrl,
        description,
        status: 'pending',
        expiresAt,
        metadata: {
          submittedVia: 'whatsapp_flow',
          customerName: `${customer.firstName || customer.whatsappName} ${customer.lastName || ''}`.trim()
        }
      }
    });

    // Parse tenant settings once for use in notifications
    let parsedSettings = {};
    try {
      parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
    } catch (e) {
      parsedSettings = {};
    }

    // Send confirmation to customer (respect tenant notify_purchase setting)
    try {
      const notifyPurchase = parsedSettings.notify_purchase !== undefined ? parsedSettings.notify_purchase : true;
      if (notifyPurchase) {
        // Format date as DD/MM/YYYY
        const day = purchaseDateObj.getDate().toString().padStart(2, '0');
        const month = (purchaseDateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = purchaseDateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        await sendWhatsAppMessage({
          phoneNumber,
          message: `✅ Transaction Submitted\n\nYour transaction claim has been received!\n\nAmount: ${formatCurrency(parseFloat(amountNgn), tenant.homeCurrency || 'NGN')}\nDate: ${formattedDate}\n\nWe'll review your claim and notify you once approved.\n\n- ${tenant.businessName}`,
          tenantId: tenant.id
        }).catch(err => console.error('Failed to send confirmation message:', err));
      } else {
        console.log('Skipping claim confirmation WhatsApp send: tenant.notify_purchase is false');
      }
    } catch (e) {
      console.error('Error checking notify_purchase before sending claim confirmation:', e);
    }

    // Send email notification to vendor admin/owner (if enabled, max 2 per day)
    try {
      const notifyNewClaims = parsedSettings?.notify_new_claims !== false; // Default to true
      if (notifyNewClaims) {
        // Check rate limit: max 2 claim notification emails per day
        const claimNotificationTimes = parsedSettings?.claim_notification_times || [];
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayNotifications = claimNotificationTimes.filter(t => t >= todayStart);
        
        if (todayNotifications.length >= 2) {
          console.log(`📧 Skipping claim notification: already sent ${todayNotifications.length} emails today (max 2/day)`);
        } else {
          // Get admin/owner vendor users for this tenant
          const vendorAdmins = await prisma.vendorUser.findMany({
            where: {
              tenantId: tenant.id,
              role: { in: ['admin', 'owner'] },
              isActive: true,
              deletedAt: null
            },
            select: { email: true, fullName: true }
          });

          // Get pending claims count for context
          const pendingClaimsCount = await prisma.purchaseClaim.count({
            where: { tenantId: tenant.id, status: 'pending' }
          });

          const customerName = claim.metadata?.customerName || customer.whatsappName || customer.firstName || 'Customer';
          const formattedAmount = formatCurrency(parseFloat(amountNgn), tenant.homeCurrency || 'NGN');

          // Send email to each admin (fire-and-forget, don't block response)
          for (const admin of vendorAdmins) {
            sendNewClaimNotification({
              vendorEmail: admin.email,
              vendorName: admin.fullName,
              businessName: tenant.businessName,
              customerName,
              customerPhone: phoneNumber,
              amount: formattedAmount,
              currency: tenant.homeCurrency || 'NGN',
              purchaseDate: purchaseDateObj,
              channel,
              claimId: claim.id,
              pendingClaimsCount
            }).catch(err => console.error('Failed to send vendor notification:', err));
          }

          if (vendorAdmins.length > 0) {
            console.log(`📧 Vendor notification sent to ${vendorAdmins.length} admin(s) (${todayNotifications.length + 1}/2 today)`);
            
            // Update the notification timestamps (keep only last 7 days to avoid bloat)
            const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
            const updatedTimes = [...claimNotificationTimes.filter(t => t >= weekAgo), now.getTime()];
            
            // Update tenant settings with new notification time
            const updatedSettings = { ...parsedSettings, claim_notification_times: updatedTimes };
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { settings: updatedSettings }
            });
          }
        }
      }
    } catch (e) {
      console.error('Error sending vendor notification:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction claim submitted successfully',
      data: {
        claimId: claim.id,
        status: 'pending',
        expiresAt: claim.expiresAt
      }
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    console.error('Error stack:', error.stack);
    
    // Send error response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to submit transaction claim',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// List pending claims for vendor
export const listClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const tenantId = req.user.tenantId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Set cache control headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const where = {
      tenantId,
      ...(status && { status })
    };

    const [claims, total] = await Promise.all([
      prisma.purchaseClaim.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              whatsappName: true,
              phoneNumber: true,
              loyaltyStatus: true,
              totalPurchases: true,
              pointsBalance: {
                select: {
                  currentBalance: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.purchaseClaim.count({ where })
    ]);

    // Calculate fraud risk flags for each claim
    const claimsWithFlags = await Promise.all(claims.map(async (claim) => {
      const flags = [];

      // High amount flag
      if (claim.amountNgn > 10000) {
        flags.push('high_amount');
      }

      // New customer flag
      if (claim.customer.totalPurchases < 3) {
        flags.push('new_customer');
      }

      // No receipt flag
      if (!claim.receiptUrl) {
        flags.push('no_receipt');
      }

      // Check rejection rate
      const [totalClaims, rejectedClaims] = await Promise.all([
        prisma.purchaseClaim.count({
          where: { customerId: claim.customerId }
        }),
        prisma.purchaseClaim.count({
          where: { customerId: claim.customerId, status: 'rejected' }
        })
      ]);

      const rejectionRate = totalClaims > 0 ? (rejectedClaims / totalClaims) * 100 : 0;
      if (rejectionRate > 30) {
        flags.push('high_rejection_rate');
      }

      // Pattern detection - same amount multiple times
      if (totalClaims >= 3) {
        const recentClaims = await prisma.purchaseClaim.findMany({
          where: { 
            customerId: claim.customerId 
          },
          select: { amountNgn: true },
          take: 5,
          orderBy: { createdAt: 'desc' }
        });

        const amounts = recentClaims.map(c => c.amountNgn);
        const uniqueAmounts = [...new Set(amounts)];
        if (uniqueAmounts.length === 1) {
          flags.push('repeated_amount');
        }
      }

      return {
        ...claim,
        fraudFlags: flags,
        metadata: {
          ...claim.metadata,
          approvalCount: totalClaims,
          rejectionCount: rejectedClaims,
          rejectionRate: Math.round(rejectionRate)
        }
      };
    }));

    res.json({
      data: claimsWithFlags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
};

// Approve or reject a claim
export const reviewClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    const tenantId = req.user.tenantId;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        error: 'Action must be either "approve" or "reject"' 
      });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ 
        error: 'Rejection reason is required' 
      });
    }

    // Find claim
    const claim = await prisma.purchaseClaim.findFirst({
      where: {
        id,
        tenantId,
        status: 'pending'
      },
      include: {
        customer: {
          include: {
            pointsBalance: true
          }
        },
        tenant: {
          select: {
            businessName: true,
            homeCurrency: true,
            settings: true
          }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ 
        error: 'Transaction claim not found or already processed' 
      });
    }

    if (action === 'approve') {
      // Approve claim - create purchase and award points
      
      // Parse tenant settings to get earn rate configuration
      let parsedSettingsForPoints = {};
      try {
        parsedSettingsForPoints = typeof claim.tenant.settings === 'string' 
          ? JSON.parse(claim.tenant.settings) 
          : (claim.tenant.settings || {});
      } catch (e) {
        parsedSettingsForPoints = {};
      }
      
      // Resolve home currency from tenant record or settings
      const resolvedHomeCurrency = claim?.tenant?.homeCurrency
        || parsedSettingsForPoints?.business?.homeCurrency
        || parsedSettingsForPoints?.homeCurrency
        || parsedSettingsForPoints?.currency;

      // Use fixed earn rates from loyalty constants
      const points = calculatePointsEarnedFromMinor(claim.amountNgn, resolvedHomeCurrency);

      const result = await prisma.$transaction(async (tx) => {
        // Create purchase record
        const purchase = await tx.purchase.create({
          data: {
            tenantId,
            customerId: claim.customerId,
            amountNgn: Math.floor(claim.amountNgn),
            pointsAwarded: points,
            source: 'claim',
            loggedByUserId: req.user.id,
            loggedVia: 'claim_approval',
            notes: `Approved claim (${claim.channel}): ${claim.description || ''}`,
            receiptUrl: claim.receiptUrl,
            createdAt: claim.purchaseDate
          }
        });

        // Create points transaction
        await tx.pointsTransaction.create({
          data: {
            tenantId,
            customerId: claim.customerId,
            transactionType: 'earn',
            points,
            purchaseId: purchase.id,
            description: `Transaction of ${formatCurrency(claim.amountNgn, claim.tenant?.homeCurrency || 'NGN')}`,
            metadata: {
              purchaseAmount: claim.amountNgn,
              purchaseId: purchase.id,
              claimId: claim.id
            }
          }
        });

        // Update points balance
        const currentBalance = claim.customer.pointsBalance?.currentBalance || 0;
        const totalEarned = claim.customer.pointsBalance?.totalPointsEarned || 0;

        if (claim.customer.pointsBalance) {
          await tx.customerPointsBalance.update({
            where: {
              tenantId_customerId: {
                tenantId,
                customerId: claim.customerId
              }
            },
            data: {
              currentBalance: currentBalance + points,
              totalPointsEarned: totalEarned + points,
              lastEarnedAt: new Date()
            }
          });
        } else {
          await tx.customerPointsBalance.create({
            data: {
              tenantId,
              customerId: claim.customerId,
              currentBalance: points,
              totalPointsEarned: points,
              totalPointsRedeemed: 0,
              lastEarnedAt: new Date()
            }
          });
        }

        // Update customer stats
        await tx.customer.update({
          where: { id: claim.customerId },
          data: {
            totalPurchases: { increment: 1 },
            totalSpentNgn: { increment: Math.floor(claim.amountNgn) },
            lastPurchaseAt: new Date()
          }
        });

        // Update claim status
        await tx.purchaseClaim.update({
          where: { id },
          data: {
            status: 'approved',
            approvedByUserId: req.user.id,
            approvedAt: new Date(),
            purchaseId: purchase.id
          }
        });

        return { purchase, points };
      });

      // Send approval notification to customer (respect tenant notify_purchase)
      try {
        const tenantSettingsRow = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        let parsedSettings = {};
        try { parsedSettings = typeof tenantSettingsRow?.settings === 'string' ? JSON.parse(tenantSettingsRow.settings) : (tenantSettingsRow?.settings || {}); } catch (e) { parsedSettings = {}; }
        const notifyPurchase = parsedSettings.notify_purchase !== undefined ? parsedSettings.notify_purchase : true;
        if (notifyPurchase) {
          const amountText = formatCurrency(claim.amountNgn, claim.tenant?.homeCurrency || 'NGN');
          // Note: Don't add 'points' suffix - the template already includes it
          const pointsText = String(result.points);
          const balanceText = String((claim.customer.pointsBalance?.currentBalance || 0) + result.points);
          const adjustmentText = pointsText;
          const reasonText = 'Claim approved';

          try {
            const templateResult = await sendTemplateMessage({
              phoneNumber: claim.phoneNumber,
              templateName: 'transaction_log',
              language: 'en',
              components: [
                {
                  type: 'header',
                  parameters: [
                    { type: 'text', text: claim.tenant.businessName }
                  ]
                },
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: amountText },
                    { type: 'text', text: pointsText },
                    { type: 'text', text: balanceText }
                  ]
                },
                {
                  type: 'button',
                  sub_type: 'quick_reply',
                  index: '0',
                  parameters: [
                    { type: 'payload', payload: `menu_${claim.tenantId}` }
                  ]
                }
              ]
            });

            if (!templateResult?.success) {
              console.error('❌ transaction_log template send failed (claim approval):', templateResult?.error || templateResult?.status);
              const fallback = `Transaction approved\nAmount: ${amountText}\nPoints added: ${pointsText} points\nNew balance: ${balanceText} points`;
              await sendWhatsAppMessage({ phoneNumber: claim.phoneNumber, message: fallback });
            }
          } catch (err) {
            console.error('❌ Error sending transaction_log template (claim approval):', err);
            const fallback = `Transaction approved\nAmount: ${amountText}\nPoints added: ${pointsText} points\nNew balance: ${balanceText} points`;
            await sendWhatsAppMessage({ phoneNumber: claim.phoneNumber, message: fallback });
          }
        } else {
          console.log('Skipping claim approval WhatsApp notification: tenant.notify_purchase is false');
        }
      } catch (e) {
        console.error('Error checking notify_purchase before sending approval notification:', e);
      }

      res.json({
        message: 'Transaction claim approved successfully',
        data: {
          claimId: claim.id,
          purchaseId: result.purchase.id,
          pointsAwarded: result.points
        }
      });
    } else {
      // Reject claim
      await prisma.purchaseClaim.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectionReason,
          approvedByUserId: req.user.id,
          approvedAt: new Date()
        }
      });

      // Send rejection notification to customer (respect tenant notify_purchase)
      try {
        const tenantSettingsRow = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        let parsedSettings = {};
        try { parsedSettings = typeof tenantSettingsRow?.settings === 'string' ? JSON.parse(tenantSettingsRow.settings) : (tenantSettingsRow?.settings || {}); } catch (e) { parsedSettings = {}; }
        const notifyPurchase = parsedSettings.notify_purchase !== undefined ? parsedSettings.notify_purchase : true;
        if (notifyPurchase) {
          await sendWhatsAppMessage({
            phoneNumber: claim.phoneNumber,
            message: `❌ Transaction Claim Rejected\n\nYour transaction claim for ${formatCurrency(claim.amountNgn, claim.tenant?.homeCurrency || 'NGN')} has been reviewed and rejected.\n\nReason: ${rejectionReason}\n\nIf you have questions, please contact us.\n- ${claim.tenant.businessName}`
          }).catch(err => console.error('Failed to send rejection message:', err));
        } else {
          console.log('Skipping claim rejection WhatsApp notification: tenant.notify_purchase is false');
        }
      } catch (e) {
        console.error('Error checking notify_purchase before sending rejection notification:', e);
      }

      res.json({
        message: 'Transaction claim rejected successfully',
        data: {
          claimId: claim.id,
          status: 'rejected'
        }
      });
    }
  } catch (error) {
    console.error('Review claim error:', error);
    res.status(500).json({ error: 'Failed to review claim' });
  }
};
