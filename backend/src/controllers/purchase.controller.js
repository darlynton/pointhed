import prisma from '../utils/prisma.js';
import formatCurrency from '../utils/formatCurrency.js';
import { sendWhatsAppMessage, sendInteractiveButtons, sendTemplateMessage } from '../services/whatsapp.service.js';
import currencyConverter from '../services/currencyConverter.js';
import { EARN_UNITS, CURRENCY_MINOR_UNITS, calculatePointsEarnedFromMinor } from '../config/loyaltyConstants.js';

// Create a purchase and award points
export const createPurchase = async (req, res) => {
  try {
    const { customerId, amountNgn, pointsEarned, description, purchaseDate } = req.body;
    const tenantId = req.user.tenantId;

    // Validation
    if (!customerId || !amountNgn) {
      return res.status(400).json({ error: 'Customer ID and amount are required' });
    }

    if (amountNgn <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Validate purchase date if provided
    let purchaseDateObj = new Date();
    if (purchaseDate) {
      purchaseDateObj = new Date(purchaseDate);
      if (isNaN(purchaseDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid purchase date' });
      }
      // Prevent future dates
      if (purchaseDateObj > new Date()) {
        return res.status(400).json({ error: 'Purchase date cannot be in the future' });
      }
    }
    // Fetch tenant details (home currency / timezone / settings) to determine local currency and notification prefs
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessName: true, whatsappConfig: true, homeCurrency: true, settings: true } });
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: tenantId,
        deletedAt: null
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer is blocked
    const isBlocked = customer.loyaltyStatus === 'blocked';

    // Parse tenant settings to allow tenant-specific earn-rate
    let parsedSettingsForPoints = {};
    try {
      parsedSettingsForPoints = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
    } catch (e) {
      parsedSettingsForPoints = {};
    }

    // Resolve home currency from tenant record or settings
    const resolvedHomeCurrency = tenant?.homeCurrency
      || parsedSettingsForPoints?.business?.homeCurrency
      || parsedSettingsForPoints?.homeCurrency
      || parsedSettingsForPoints?.currency
      || 'NGN';

    // Use FIXED earn rate from loyaltyConstants.js
    // points_earned = floor(transaction_amount / earn_unit)
    const pointsFromAmount = calculatePointsEarnedFromMinor(amountNgn, resolvedHomeCurrency);
    const points = isBlocked ? 0 : (pointsEarned || pointsFromAmount);

    // Create purchase and award points in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create purchase record (always record purchase regardless of blocked status)
      const purchase = await tx.purchase.create({
        data: {
          tenantId: tenantId,
          customerId: customerId,
          amountNgn: amountNgn,
          pointsAwarded: points,
          source: 'manual',
          loggedByUserId: req.user.id,
          loggedVia: 'vendor_portal',
          notes: isBlocked 
            ? `${description || ''} [Customer blocked - no points awarded]`.trim()
            : description || null,
          createdAt: purchaseDateObj
        }
      });

      // Only create points transaction and update balance if customer is not blocked
      let pointsTransaction = null;
      if (!isBlocked && points > 0) {
        // Create points transaction
        pointsTransaction = await tx.pointsTransaction.create({
          data: {
            tenantId: tenantId,
            customerId: customerId,
            transactionType: 'earn',
            points: points,
            purchaseId: purchase.id,
            description: description || `Purchase of ${formatCurrency(amountNgn, tenant.homeCurrency || 'NGN')}`,
            metadata: {
              purchaseAmount: amountNgn,
              purchaseId: purchase.id
            }
          }
        });
      }

      // Update or create points balance (only for non-blocked customers)
      let pointsBalance = null;
      if (!isBlocked && points > 0) {
        const existingBalance = await tx.customerPointsBalance.findUnique({
          where: {
            tenantId_customerId: {
              tenantId: tenantId,
              customerId: customerId
            }
          }
        });

        if (existingBalance) {
          pointsBalance = await tx.customerPointsBalance.update({
            where: {
              tenantId_customerId: {
                tenantId: tenantId,
                customerId: customerId
              }
            },
            data: {
              currentBalance: existingBalance.currentBalance + points,
              totalPointsEarned: existingBalance.totalPointsEarned + points,
              lastEarnedAt: new Date()
            }
          });
        } else {
          pointsBalance = await tx.customerPointsBalance.create({
            data: {
              tenantId: tenantId,
              customerId: customerId,
              currentBalance: points,
              totalPointsEarned: points,
              totalPointsRedeemed: 0,
              lastEarnedAt: new Date()
            }
          });
        }
      } else {
        // For blocked customers, just fetch existing balance without updating
        pointsBalance = await tx.customerPointsBalance.findUnique({
          where: {
            tenantId_customerId: {
              tenantId: tenantId,
              customerId: customerId
            }
          }
        });
      }

      // Create financial transaction (dual-amount ledger) regardless of blocked status
      try {
        const localCurrency = (tenant && tenant.homeCurrency) ? tenant.homeCurrency : 'NGN';
        // Convert local amount to GBP (base) with 2 decimal precision (banker's rounding enforced in service)
        const conv = await currencyConverter.convert(amountNgn, localCurrency, 'GBP', 2);

        await tx.transaction.create({
          data: {
            vendorId: tenantId,
            customerId: customerId,
            amountLocal: amountNgn.toString(),
            currencyCode: localCurrency,
            amountBase: conv.amount,
            exchangeRate: conv.rate,
            timestampUtc: purchaseDateObj,
            metadata: { purchaseId: purchase.id }
          }
        });
      } catch (convErr) {
        // Log conversion error but don't fail the purchase creation
        console.error('Currency conversion failed when creating transaction:', convErr);
        await tx.transaction.create({
          data: {
            vendorId: tenantId,
            customerId: customerId,
            amountLocal: amountNgn.toString(),
            currencyCode: (tenant && tenant.homeCurrency) ? tenant.homeCurrency : 'NGN',
            amountBase: amountNgn.toString(),
            exchangeRate: '1',
            timestampUtc: purchaseDateObj,
            metadata: { purchaseId: purchase.id, conversionError: String(convErr?.message || convErr) }
          }
        });
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPurchases: { increment: 1 },
          totalSpentNgn: { increment: amountNgn },
          lastPurchaseAt: new Date()
        }
      });

      return { purchase, pointsBalance, pointsTransaction };
    });
      // Parse tenant settings to check notification toggles
      let parsedSettings = {};
      try {
        parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
      } catch (e) {
        parsedSettings = {};
      }

      const notifyPurchase = parsedSettings.notify_purchase !== undefined ? parsedSettings.notify_purchase : true;
      if (!notifyPurchase) {
        // Notifications disabled for purchases - skip WhatsApp send
        console.log('Skipping purchase WhatsApp notification: tenant.notify_purchase is false');
      } else {

        // Send WhatsApp notification to customer
        if (customer.phoneNumber && customer.optedIn) {
          // Fetch latest balance for template rendering (handles 0-point cases)
          const balanceRecord = await prisma.customerPointsBalance.findUnique({
            where: {
              tenantId_customerId: {
                tenantId,
                customerId: customer.id
              }
            }
          });

          // Avoid redeclaring `tenant` (already present above); fetch only what's needed
          const tenantInfo = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
              businessName: true,
              whatsappConfig: true,
              homeCurrency: true
            }
          });

          const formattedAmount = formatCurrency(amountNgn, tenantInfo.homeCurrency || 'NGN');

          if (!isBlocked) {
            // Use WhatsApp template for transactions (transaction_log)
            // Note: Don't add 'points' suffix - the template already includes it
            const balanceText = String(balanceRecord?.currentBalance ?? 0);
            const pointsText = String(points);
            const adjustmentText = pointsText;
            const reasonText = description || 'Purchase recorded';

            try {
              const templateResult = await sendTemplateMessage({
                phoneNumber: customer.phoneNumber,
                templateName: 'transaction_log',
                language: 'en',
                components: [
                  {
                    type: 'header',
                    parameters: [
                      { type: 'text', text: tenantInfo.businessName }
                    ]
                  },
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: formattedAmount },
                    { type: 'text', text: pointsText },
                    { type: 'text', text: balanceText }
                  ]
                },
                {
                  type: 'button',
                  sub_type: 'quick_reply',
                  index: '0',
                  parameters: [
                    { type: 'payload', payload: `menu_${tenantId}` }
                  ]
                }
              ]
            });

              if (!templateResult?.success) {
                console.error('❌ transaction_log template send failed:', templateResult?.error || templateResult?.status);
                // Fallback to minimal text message (no emojis)
                const fallback = `Purchase recorded\nAmount: ${formattedAmount}\nPoints added: ${pointsText} points\nNew balance: ${balanceText} points`;
                await sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message: fallback });
              }
            } catch (err) {
              console.error('❌ Error sending transaction_log template:', err);
              const fallback = `Purchase recorded\nAmount: ${formattedAmount}\nPoints added: ${pointsText} points\nNew balance: ${balanceText} points`;
              await sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message: fallback });
            }

            // Send points_update template for balance change
            try {
              const newBalance = result.pointsBalance?.currentBalance ?? balanceRecord?.currentBalance ?? 0;
              const pointsUpdateResult = await sendTemplateMessage({
                phoneNumber: customer.phoneNumber,
                templateName: 'points_update',
                language: 'en',
                components: [
                  {
                    type: 'header',
                    parameters: [
                      { type: 'text', text: tenantInfo.businessName }
                    ]
                  },
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: adjustmentText },
                      { type: 'text', text: reasonText },
                      { type: 'text', text: String(newBalance) }
                    ]
                  },
                  {
                    type: 'button',
                    sub_type: 'quick_reply',
                    parameters: [
                      { type: 'payload', payload: `menu_${tenantId}` }
                    ]
                  }
                ]
              });

              if (!pointsUpdateResult?.success) {
                console.error('❌ points_update template send failed:', pointsUpdateResult?.error || pointsUpdateResult?.status);
              }
            } catch (err) {
              console.error('❌ Error sending points_update template:', err);
            }
          } else if (isBlocked) {
            // Customer is blocked
            const blockedMessage = `📝 Purchase Recorded\n\nYour purchase of ${formatCurrency(amountNgn, tenantInfo.homeCurrency || 'NGN')} at ${tenantInfo.businessName} has been recorded.\n\n⚠️ Your account is currently blocked, so no points were awarded. Please contact the business for assistance.`;

            await sendInteractiveButtons({
              phoneNumber: customer.phoneNumber,
              headerText: tenantInfo.businessName,
              bodyText: blockedMessage,
              tenantId: tenantId,
              buttons: [{ title: 'Menu' }, { title: 'Help' }]
            }).catch(async (err) => {
              console.error('Interactive send failed, falling back to text:', err);
              await sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message: blockedMessage });
            });

          } else {
            // No points earned (amount too small)
            const noPointsMessage = `📝 Purchase Recorded\n\nYour purchase of ${formatCurrency(amountNgn, tenantInfo.homeCurrency || 'NGN')} at ${tenantInfo.businessName} has been recorded.\n\nKeep shopping to earn points!`;

            await sendInteractiveButtons({
              phoneNumber: customer.phoneNumber,
              headerText: tenantInfo.businessName,
              bodyText: noPointsMessage,
              tenantId: tenantId,
              buttons: [{ title: 'Menu' }]
            }).catch(async (err) => {
              console.error('Interactive send failed, falling back to text:', err);
              await sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message: noPointsMessage });
            });
          }
        }

      }

      res.status(201).json({
        success: true,
        data: {
          purchase: result.purchase,
          pointsEarned: points,
          newBalance: result.pointsBalance?.currentBalance || 0,
          ...(isBlocked && { warning: 'Purchase recorded but no points awarded - customer is blocked' })
        }
      });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
};

// List purchases for tenant
export const listPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20, customerId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const where = {
      tenantId: req.user.tenantId,
      ...(customerId && { customerId }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              whatsappName: true,
              phoneNumber: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchase.count({ where })
    ]);

    res.json({
      data: purchases,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

// Get single purchase
export const getPurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            whatsappName: true,
            phoneNumber: true
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({ data: purchase });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
};
