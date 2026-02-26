// WhatsApp Webhook Controller
// Handles incoming messages and status updates from Meta

import prisma from '../utils/prisma.js';
import { sendWhatsAppFlow, sendWhatsAppMessage, sendInteractiveButtons, sendInteractiveList, sendRewardCarousel, sendTemplateMessage, sendWhatsAppImage, generateRedemptionQrImage } from '../services/whatsapp.service.js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_FLOW_ID = process.env.WHATSAPP_FLOW_ID;

// Input validation and sanitization helpers
const MAX_MESSAGE_LENGTH = 4096; // WhatsApp message limit
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

function sanitizeString(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return '';
  // Remove control characters and limit length
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, maxLength);
}

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\s/g, '');
  return PHONE_REGEX.test(cleaned) && cleaned.length <= 16;
}

function validateWebhookPayload(body) {
  // Basic structure validation
  if (!body || typeof body !== 'object') return false;
  if (body.object !== 'whatsapp_business_account') return false;
  if (!Array.isArray(body.entry)) return false;
  return true;
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  
  // Validate phone number
  if (!validatePhoneNumber(message.from)) {
    console.warn('⚠️ Invalid phone number in message:', message.from);
    return null;
  }
  
  // Sanitize text content if present
  if (message.text?.body) {
    message.text.body = sanitizeString(message.text.body, MAX_MESSAGE_LENGTH);
  }
  
  // Sanitize button text if present
  if (message.button?.text) {
    message.button.text = sanitizeString(message.button.text, 200);
  }
  if (message.button?.payload) {
    message.button.payload = sanitizeString(message.button.payload, 500);
  }
  
  // Sanitize interactive responses
  if (message.interactive?.button_reply?.title) {
    message.interactive.button_reply.title = sanitizeString(message.interactive.button_reply.title, 200);
  }
  if (message.interactive?.button_reply?.id) {
    message.interactive.button_reply.id = sanitizeString(message.interactive.button_reply.id, 256);
  }
  if (message.interactive?.list_reply?.id) {
    message.interactive.list_reply.id = sanitizeString(message.interactive.list_reply.id, 256);
  }
  if (message.interactive?.list_reply?.title) {
    message.interactive.list_reply.title = sanitizeString(message.interactive.list_reply.title, 200);
  }
  
  return message;
}

function normalizeCommandText(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function cancelRedemptionWithRefund({ redemptionId, tenantId, reason }) {
  try {
    if (!redemptionId || !tenantId) return null;
    const redemption = await prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, tenantId }
    });

    if (!redemption || redemption.cancelledAt || redemption.status === 'fulfilled') return redemption;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.rewardRedemption.update({
        where: { id: redemptionId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason || 'Delivery failed'
        }
      });

      await tx.customerPointsBalance.update({
        where: { tenantId_customerId: { tenantId, customerId: redemption.customerId } },
        data: {
          currentBalance: { increment: redemption.pointsDeducted },
          totalPointsRedeemed: { decrement: redemption.pointsDeducted }
        }
      });

      await tx.pointsTransaction.create({
        data: {
          tenantId,
          customerId: redemption.customerId,
          transactionType: 'refunded',
          points: redemption.pointsDeducted,
          rewardRedemptionId: redemption.id,
          description: `Refund for failed delivery: ${reason || 'Delivery failed'}`
        }
      });

      return updated;
    });
  } catch (error) {
    console.warn('⚠️ Failed to cancel redemption after delivery failure:', error?.message || error);
    return null;
  }
}

// Webhook verification (GET request from Meta)
export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Check if token matches
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    res.sendStatus(500);
  }
};

// Handle incoming webhook events (POST request from Meta)
export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Validate webhook payload structure
    if (!validateWebhookPayload(body)) {
      console.warn('⚠️ Invalid webhook payload structure');
      return res.sendStatus(400);
    }

    // Process each entry (can contain multiple events)
    for (const entry of body.entry) {
      if (!Array.isArray(entry?.changes)) continue;
      
      for (const change of entry.changes) {
        const value = change.value;
        if (!value || typeof value !== 'object') continue;

        // Handle incoming messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const rawMessage of value.messages) {
            // Sanitize and validate message before processing
            const message = sanitizeMessage(rawMessage);
            if (!message) {
              console.warn('⚠️ Skipping invalid message');
              continue;
            }
            await handleIncomingMessage(message, value.metadata);
          }
        }

        // Handle message status updates (sent, delivered, read)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            handleStatusUpdate(status, value.metadata);
          }
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.sendStatus(500);
  }
};

// Helper function to get active vendor for customer
async function getActiveVendorCustomer(phoneNumber) {
  // Try a few phone number variants (with/without leading +) to be resilient
  const variants = normalizePhoneVariants(phoneNumber);
  const customers = await prisma.customer.findMany({
    where: {
      phoneNumber: { in: variants },
      deletedAt: null
    },
    orderBy: { updatedAt: 'desc' }, // Most recently updated first
    include: {
      tenant: {
        select: {
          id: true,
          businessName: true,
          vendorCode: true,
          homeCurrency: true
        }
      }
    }
  });

  if (customers.length === 0) return null;
  if (customers.length === 1) return customers[0];

  // Multiple vendors - check for active vendor in conversation state
  const activeCustomer = customers.find(c => c.conversationState?.activeVendor === true);
  // If no active vendor set, return most recently updated (first in ordered list)
  return activeCustomer || customers[0];
}

// Helper function to set active vendor
async function setActiveVendor(phoneNumber, tenantId) {
  const variants = normalizePhoneVariants(phoneNumber);
  // Set all to inactive for this phone across tenants
  await prisma.customer.updateMany({
    where: {
      phoneNumber: { in: variants },
      deletedAt: null
    },
    data: {
      conversationState: { activeVendor: false }
    }
  });

  // Set the selected one to active AND update timestamp so it's first in orderBy
  await prisma.customer.updateMany({
    where: {
      phoneNumber: { in: variants },
      tenantId: tenantId,
      deletedAt: null
    },
    data: {
      conversationState: { activeVendor: true },
      updatedAt: new Date()
    }
  });
}

// Normalize phone into common lookup variants
function normalizePhoneVariants(phone) {
  const p = (phone || '').toString().trim();
  const noPlus = p.replace(/^\+/, '');
  const withPlus = noPlus ? `+${noPlus}` : p;
  const variants = [p, noPlus, withPlus].filter(v => v && v.length > 0);
  // Deduplicate
  return Array.from(new Set(variants));
}

function ensurePlus(phone) {
  const noPlus = (phone || '').toString().trim().replace(/^\+/, '');
  return `+${noPlus}`;
}

// Send a paginated interactive rewards list (max 8 rewards + nav rows per page to respect WA limits)
async function sendRewardsListPage({ customer, phoneNumber, page = 0, pageSize = 8 }) {
  const rewards = await prisma.reward.findMany({
    where: { tenantId: customer.tenantId, deletedAt: null, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  if (!rewards || rewards.length === 0) {
    await sendWhatsAppMessage({ phoneNumber, tenantId: customer.tenantId, message: `${customer.tenant.businessName} has no rewards right now.` });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(rewards.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const pageRewards = rewards.slice(start, start + pageSize);

  const rows = pageRewards.map((r) => {
    const pts = r.pointsRequired ?? r.points_required ?? 0;
    const title = `${r.name}`.substring(0, 24);
    const description = `${pts} pts`.substring(0, 72);
    return { id: `reward_${r.id}`, title, description };
  });

  // Navigation rows (keep total rows <= 10)
  if (safePage > 0) {
    rows.push({ id: `rewards_page_${safePage - 1}`, title: '← Previous page', description: `Page ${safePage}/${totalPages}` });
  }
  if (safePage < totalPages - 1 && rows.length < 10) {
    rows.push({ id: `rewards_page_${safePage + 1}`, title: 'Next page →', description: `Page ${safePage + 2} of ${totalPages}` });
  }

  await sendInteractiveList({
    phoneNumber,
    headerText: 'Available rewards',
    bodyText: 'Select a reward to redeem.',
    buttonText: 'Choose reward',
    tenantId: customer.tenantId,
    sections: [{ title: `Page ${safePage + 1} of ${totalPages}`, rows }]
  });
}

// Check if a URL is an absolute HTTP(S) link (usable by WhatsApp Cloud API)
function isAbsoluteHttpUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url);
}

// Process incoming message
async function handleIncomingMessage(message, metadata) {
  console.log(`💬 Message from ${message.from}: ${message.type}`);

  // Handle WhatsApp Flow completion (nfm_reply)
  if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
    const nfmReply = message.interactive.nfm_reply;
    console.log('📋 Flow completion received:', JSON.stringify(nfmReply, null, 2));
    
    try {
      const responseJson = JSON.parse(nfmReply.response_json);
      const flowToken = responseJson.flow_token;
      
      console.log('📋 Parsed Flow response:', JSON.stringify(responseJson, null, 2));
      console.log('📋 Phone number from message:', message.from);
      
      // Extract vendor code from flow_token
      const vendorCode = flowToken;
      
      // Normalize phone number to match database format
      const phoneVariants = normalizePhoneVariants(message.from);
      console.log('📋 Phone number variants:', phoneVariants);
      
      // Use the first variant (most common format)
      const phoneNumber = phoneVariants[0];
      
      // Prepare claim data
      // Pass amount as-is (major units from Flow) so controller can convert to minor units
      const claimData = {
        phoneNumber,
        vendorCode,
        amount: parseFloat(responseJson.amount), // In major units (e.g., pounds, not pence)
        purchaseDate: responseJson.purchase_date,
        channel: responseJson.channel,
        receiptUrl: responseJson.receipt_url,
        description: responseJson.description || responseJson.notes,
        flow_token: flowToken, // Include flow_token to trigger conversion
        data: { amount: parseFloat(responseJson.amount) } // Trigger Flow amount conversion in controller
      };
      
      console.log('📋 Submitting claim:', JSON.stringify(claimData, null, 2));
      
      // Call submitClaim controller
      const { submitClaim } = await import('./purchaseClaim.controller.js');
      
      const mockReq = {
        body: claimData
      };
      
      const mockRes = {
        statusCode: 200,
        headersSent: false,
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: async function(data) {
          this.headersSent = true;
          console.log(`✅ Claim submission result (${this.statusCode}):`, JSON.stringify(data, null, 2));
          
          // Send WhatsApp confirmation based on result
          if (this.statusCode >= 200 && this.statusCode < 300) {
            // Success - confirmation already sent by controller
            console.log('✅ Claim submitted successfully via Flow');
          } else {
            // Error - send error message
            const errorMsg = data.error || 'Failed to submit claim';
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ ${errorMsg}`
            });
          }
        }
      };
      
      await submitClaim(mockReq, mockRes);
      
    } catch (error) {
      console.error('❌ Error processing Flow completion:', error);
      await sendWhatsAppMessage({
        phoneNumber: message.from,
        message: '❌ Error processing your claim. Please try again.'
      });
    }
    
    return; // Done processing Flow response
  }

  // Handle button responses (interactive messages)
  if (message.type === 'interactive') {
    const buttonReply = message.interactive?.button_reply;
    const listReply = message.interactive?.list_reply;
    
      if (buttonReply) {
        const buttonText = (buttonReply.title || '').toLowerCase();
        const buttonId = (buttonReply.id || '').toString();
        console.log(`🔘 Button clicked: title='${buttonText}' id='${buttonId}'`);

      if (buttonId.startsWith('menu_')) {
        const tenantId = buttonId.split('_').slice(1).join('_');
        try {
          await setActiveVendor(message.from, tenantId);
        } catch (e) {
          console.warn('⚠️ Failed to set active vendor from menu payload', e);
        }
        message.text = { body: 'menu' };
        message.type = 'text';
      }

      if (buttonId.startsWith('join_')) {
        const tenantId = buttonId.split('_').slice(1).join('_');
        try {
          await setActiveVendor(message.from, tenantId);
        } catch (e) {
          console.warn('⚠️ Failed to set active vendor from join payload', e);
        }
        message.text = { body: 'activate points' };
        message.type = 'text';
      }

      if (buttonId.startsWith('copycode_')) {
        const code = buttonId.split('_').slice(1).join('_');
        await sendWhatsAppMessage({
          phoneNumber: message.from,
          message: `🎟️ Redemption Code: ${code}`
          });
          return;
        }

      // If button id encodes an action (e.g., redeem_<rewardId>), handle that first
      if (buttonId.startsWith('redeem_')) {
        const rewardId = buttonId.split('_').slice(1).join('_');
        try {
          // Get customer from phone number
          let customer = await getActiveVendorCustomer(message.from);
          if (!customer) {
            const variants = normalizePhoneVariants(message.from);
            customer = await prisma.customer.findFirst({
              where: { phoneNumber: { in: variants }, deletedAt: null },
              include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } }
            });
          }

          if (!customer) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ You're not registered yet. Please register first with CLAIM_[VENDOR_CODE].`
            });
            return;
          }

          // Get the reward
          const reward = await prisma.reward.findUnique({
            where: { id: rewardId },
            include: { tenant: true }
          });

          if (!reward) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ Reward not found.`
            });
            return;
          }

          // Check if reward belongs to customer's tenant
          if (reward.tenantId !== customer.tenantId) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ This reward is not available for your current business.`
            });
            return;
          }

          // Import the reward controller and call redeemReward
          const rewardController = await import('./reward.controller.js');
          const mockReq = {
            tenantId: customer.tenantId,
            user: { tenantId: customer.tenantId },
            params: { id: rewardId },
            body: { customerId: customer.id },
            headers: {
              'x-idempotency-key': `whatsapp_${message.from}_${rewardId}_${Date.now()}`,
              'x-suppress-whatsapp': 'true'
            }
          };

          let redemptionResult = null;
          let redemptionError = null;

          const mockRes = {
            status: (code) => ({
              json: async (data) => {
                if (code === 200 || code === 201) {
                  redemptionResult = data;
                } else {
                  redemptionError = data.error || 'Unknown error';
                }
              }
            }),
            json: async (data) => {
              if (data.success) {
                redemptionResult = data;
              } else {
                redemptionError = data.error || 'Unknown error';
              }
            }
          };

          await rewardController.redeemReward(mockReq, mockRes);

          if (redemptionError) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ ${redemptionError}\n\nPlease check your balance and try again.`
            });
          } else if (redemptionResult) {
            const code = redemptionResult.data?.redemption?.redemptionCode || 'N/A';
            const balance = redemptionResult.data?.updatedBalance?.currentBalance || 0;
            const rewardName = reward?.name || 'Reward';
            const caption = `🎉 Redemption Successful!\n\n🎁 ${rewardName}\n🎟️ Code: ${code}\n\nShow this QR code or send the above code to the business to confirm and fulfill your reward.`;
            const redemptionId = redemptionResult.data?.redemption?.id;
            let delivered = false;
            try {
              const qrUrl = await generateRedemptionQrImage({
                code,
                validUntil: reward?.validUntil || null
              });
              const imageResult = await sendWhatsAppImage({
                phoneNumber: message.from,
                imageUrl: qrUrl,
                caption,
                tenantId: customer.tenantId
              });
              if (!imageResult?.success) {
                throw new Error(imageResult?.error || 'WhatsApp image send failed');
              }
              delivered = true;
            } catch (qrError) {
              console.error('❌ Failed to send redemption QR image:', qrError);
              const textResult = await sendWhatsAppMessage({
                phoneNumber: message.from,
                message: `🎉 Redemption Successful!\n\n🎁 ${rewardName}\n🎟️ Code: ${code}\n\nShow this message or send the above code to ${customer.tenant.businessName} to confirm and fulfill your reward.`
              });
              if (textResult?.success) {
                delivered = true;
              }
            }
            if (!delivered) {
              await cancelRedemptionWithRefund({
                redemptionId,
                tenantId: customer.tenantId,
                reason: 'WhatsApp delivery failed'
              });
            }
          }
        } catch (error) {
          console.error('❌ Error redeeming reward via button:', error);
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ Error processing redemption. Please try again later.`
          });
        }
        return;
      }

      // Confirm redemption button (second step)
      if (buttonId.startsWith('confirm_')) {
        const rewardId = buttonId.split('_').slice(1).join('_');
        // Reuse the REDEEM_ text handler for actual redemption
        message.text = { body: `REDEEM_${rewardId}` };
        message.type = 'text';
        console.log('✅ Normalized confirm button to REDEEM text');
        // fall through to text handler
      }

      if (buttonId === 'cancel_redeem' || buttonId.startsWith('cancel_redeem_')) {
        const rewardId = buttonId.startsWith('cancel_redeem_')
          ? buttonId.split('_').slice(2).join('_')
          : null;
        if (rewardId) {
          try {
            let customer = await getActiveVendorCustomer(message.from);
            if (!customer) {
              const variants = normalizePhoneVariants(message.from);
              customer = await prisma.customer.findFirst({
                where: { phoneNumber: { in: variants }, deletedAt: null },
                include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } }
              });
            }

            if (customer) {
              const [reward, redemption, balanceRec] = await Promise.all([
                prisma.reward.findUnique({ where: { id: rewardId } }),
                prisma.rewardRedemption.findFirst({
                  where: {
                    tenantId: customer.tenantId,
                    customerId: customer.id,
                    rewardId,
                    cancelledAt: null
                  },
                  orderBy: { createdAt: 'desc' }
                }),
                prisma.customerPointsBalance.findUnique({
                  where: { tenantId_customerId: { tenantId: customer.tenantId, customerId: customer.id } },
                  select: { currentBalance: true }
                })
              ]);

              if (redemption && reward) {
                const balance = balanceRec?.currentBalance ?? 0;
                await sendWhatsAppMessage({
                  phoneNumber: message.from,
                  message: `✅ This reward was already redeemed.\n\nCode: ${redemption.redemptionCode}\nReward: ${reward.name}\nBalance: ${balance} points\n\nShow this code to ${customer.tenant.businessName} to claim your reward.`
                });
                return;
              }
            }
          } catch (error) {
            console.error('❌ Error handling cancel after redemption:', error);
          }
        }

        await sendWhatsAppMessage({ phoneNumber: message.from, message: '🚫 Redemption cancelled. Send "rewards" to view options again.' });
        return;
      }

      // If user tapped the 'View More Rewards' button on the top-card, send the interactive list
      if (buttonId === 'view_rewards_list') {
        try {
          let customer = await getActiveVendorCustomer(message.from);
          if (!customer) {
            const variants = normalizePhoneVariants(message.from);
            customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, deletedAt: null }, include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } } });
          }
          if (!customer) {
            await sendWhatsAppMessage({ phoneNumber: message.from, message: `You're not registered with any business yet.` });
            return;
          }

          await sendRewardsListPage({ customer, phoneNumber: message.from, page: 0 });
        } catch (e) {
          console.error('❌ Error sending rewards list via button:', e);
        }
        return;
      }

      // Route based on button text
      if (buttonText.includes('submit claim') || buttonText.includes('submit transaction')) {
        // Trigger claim flow
        message.text = { body: 'claim' };
        message.type = 'text';
        // Let it fall through to text handling
      } else if (buttonText.includes('check balance')) {
        message.text = { body: 'balance' };
        message.type = 'text';
      } else if (buttonText.includes('view rewards')) {
        message.text = { body: 'rewards' };
        message.type = 'text';
      } else if (buttonText.includes('switch business')) {
        message.text = { body: 'businesses' };
        message.type = 'text';
      } else if (buttonText.includes('activate points') || buttonText === 'activate') {
        message.text = { body: 'activate points' };
        message.type = 'text';
        console.log('✅ Normalized "activate points" button to text message');
      }
      // If user clicked the Menu button, normalize to a text 'menu' message so
      // the existing text-handling code shows the interactive menu.
      if (buttonReply && buttonReply.title && buttonReply.title.toLowerCase().includes('menu')) {
        message.text = { body: 'menu' };
        message.type = 'text';
      }
    }
    
    console.log(`📝 Message type after button processing: ${message.type}, text body: ${message.text?.body || 'none'}`);

    if (listReply) {
      // Handle business selection from list
      const selectedItem = listReply.id || listReply.title.replace('✓ ', '');
      const selectedItemNormalized = normalizeCommandText(String(selectedItem || ''));
      console.log(`📋 List item selected: ${selectedItem}`);
      
      // Handle menu actions
      if (selectedItem === 'claim' || selectedItemNormalized === 'claim' || selectedItemNormalized.includes('submit')) {
        message.text = { body: 'claim' };
        message.type = 'text';
        // Fall through to text handling
      } else if (selectedItem === 'balance' || selectedItemNormalized.includes('balance')) {
        message.text = { body: 'balance' };
        message.type = 'text';
        // Fall through to text handling
      } else if (selectedItem && selectedItem.toString().startsWith('rewards_page_')) {
        try {
          const pageNum = parseInt(selectedItem.split('_')[2] || '0', 10) || 0;
          let customer = await getActiveVendorCustomer(message.from);
          if (!customer) {
            const variants = normalizePhoneVariants(message.from);
            customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, deletedAt: null }, include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } } });
          }
          if (!customer) {
            await sendWhatsAppMessage({ phoneNumber: message.from, message: `You're not registered with any business yet.` });
            return;
          }
          await sendRewardsListPage({ customer, phoneNumber: message.from, page: pageNum });
        } catch (error) {
          console.error('❌ Error showing rewards page:', error);
        }
        return;
      } else if (selectedItem === 'rewards' || selectedItemNormalized.includes('reward')) {
        message.text = { body: 'rewards' };
        message.type = 'text';
        // Fall through to text handling
      } else if (selectedItem && selectedItem.toString().startsWith('reward_')) {
        try {
          const rewardId = selectedItem.split('_').slice(1).join('_');
          const reward = await prisma.reward.findUnique({ where: { id: rewardId }, include: { tenant: true } });
          if (!reward || reward.deletedAt || reward.isActive === false) {
            await sendWhatsAppMessage({ phoneNumber: message.from, message: '❌ Reward not available.' });
            return;
          }

          // Validate tenant context
          let customer = await getActiveVendorCustomer(message.from);
          if (!customer) {
            const variants = normalizePhoneVariants(message.from);
            customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, deletedAt: null }, include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } } });
          }
          if (!customer || reward.tenantId !== customer.tenantId) {
            await sendWhatsAppMessage({ phoneNumber: message.from, message: '❌ This reward is not available for your business.' });
            return;
          }

          // Get balance for confirmation
          const balanceRec = await prisma.customerPointsBalance.findUnique({
            where: { tenantId_customerId: { tenantId: customer.tenantId, customerId: customer.id } },
            select: { currentBalance: true }
          });
          const currentBalance = balanceRec?.currentBalance || 0;
          const points = reward.pointsRequired ?? reward.points_required ?? 0;
          const balanceAfter = currentBalance - points;
          const insufficient = balanceAfter < 0;

          if (insufficient) {
            // Not enough points - show error with alternatives
            const pointsNeeded = points - currentBalance;
            await sendInteractiveButtons({
              phoneNumber: message.from,
              headerText: `${reward.tenant?.businessName || 'Business'}: ${reward.name}`,
              bodyText: `Cost: ${points.toLocaleString()} points\nYour balance: ${currentBalance.toLocaleString()} points\n\n❌ You need ${pointsNeeded.toLocaleString()} more points to redeem this.`,
              tenantId: reward.tenantId,
              buttons: [
                { title: '🎁 View Rewards' }
              ]
            });
          } else {
            // Enough points - show confirmation
            const bodyText = `Reward: ${reward.name}\nCost: ${points.toLocaleString()} points\nBalance after: ${balanceAfter.toLocaleString()} points`;

            await sendInteractiveButtons({
              phoneNumber: message.from,
              headerText: `${reward.tenant?.businessName || 'Business'}: Confirm redemption`,
              bodyText,
              tenantId: reward.tenantId,
              buttons: [
                { id: `confirm_${reward.id}`, title: 'Confirm' },
                { id: `cancel_redeem_${reward.id}`, title: 'Cancel' }
              ]
            });
          }
        } catch (error) {
          console.error('❌ Error handling reward selection:', error);
        }
        return;
      } else if (selectedItem === 'switch' || selectedItemNormalized.includes('switch') || selectedItemNormalized.includes('business')) {
        message.text = { body: 'businesses' };
        message.type = 'text';
        // Fall through to text handling
      } else {
        // Handle business selection by ID
        try {
          // Check if this is a business ID (starts with "business_")
          if (selectedItem.startsWith('business_')) {
            // Get all customers for this phone number (try variants)
            const variants = normalizePhoneVariants(message.from);
            const allCustomers = await prisma.customer.findMany({
              where: {
                phoneNumber: { in: variants },
                deletedAt: null
              },
              orderBy: { updatedAt: 'desc' },
              include: {
                tenant: {
                  select: {
                    id: true,
                    businessName: true
                  }
                },
                pointsBalance: {
                  select: {
                    currentBalance: true
                  }
                }
              }
            });

            // Extract index from ID (business_0_xxx -> index 0)
            const parts = selectedItem.split('_');
            const index = parseInt(parts[1]);
            const customer = allCustomers[index];

            if (customer) {
              // Set as active vendor
              await setActiveVendor(message.from, customer.tenant.id);
              
              const points = customer.pointsBalance?.currentBalance || 0;
              await sendInteractiveButtons({
                phoneNumber: message.from,
                bodyText: `✓ Switched to ${customer.tenant.businessName}\n\nCurrent Balance: ${points} points\n\nWhat would you like to do next?`,
                tenantId: customer.tenant.id,
                buttons: [
                  { title: '🎁 View Rewards' },
                  { title: '📝 Submit Transaction' },
                  { title: '📋 Main Menu' }
                ]

              });
            }
          } else {
            // Fallback: try to find by business name (try variants)
            const variants = normalizePhoneVariants(message.from);
            const customer = await prisma.customer.findFirst({
              where: {
                phoneNumber: { in: variants },
                deletedAt: null,
                tenant: {
                  businessName: selectedItem
                }
              },
              include: {
                tenant: {
                  select: {
                    id: true,
                    businessName: true
                  }
                },
                pointsBalance: {
                  select: {
                    currentBalance: true
                  }
                }
              }
            });

            if (customer) {
              // Set as active vendor
              await setActiveVendor(message.from, customer.tenant.id);
              
              const points = customer.pointsBalance?.currentBalance || 0;
              await sendInteractiveButtons({
                phoneNumber: message.from,
                bodyText: `✓ Switched to ${customer.tenant.businessName}\n\nCurrent Balance: ${points} points\n\nWhat would you like to do next?`,
                tenantId: customer.tenant.id,
                buttons: [
                  { title: '🎁 View Rewards' },
                  { title: '📝 Submit Transaction' },
                  { title: '📋 Main Menu' }
                ]
              });
            }
          }
        } catch (error) {
          console.error('❌ Error switching business:', error);
        }
        return; // Only return for business selection, not menu actions
      }
    }
  }

  // Handle simple button type (newer WhatsApp format) - normalize to text BEFORE text handler
  if (message.type === 'button') {
    const buttonText = (message.button?.text || '').toLowerCase();
    const buttonPayload = (message.button?.payload || '').toString();
    console.log(`🔘 Button: ${message.button?.text || 'unknown'}`);

    if (buttonPayload.startsWith('menu_')) {
      const tenantId = buttonPayload.split('_').slice(1).join('_');
      try {
        await setActiveVendor(message.from, tenantId);
      } catch (e) {
        console.warn('⚠️ Failed to set active vendor from menu payload', e);
      }
      message.text = { body: 'menu' };
      message.type = 'text';
      console.log('✅ Normalized "menu" button payload to text message with tenant context');
    }

    if (buttonPayload.startsWith('join_')) {
      const tenantId = buttonPayload.split('_').slice(1).join('_');
      try {
        await setActiveVendor(message.from, tenantId);
      } catch (e) {
        console.warn('⚠️ Failed to set active vendor from join payload', e);
      }
      message.text = { body: 'activate points' };
      message.type = 'text';
      console.log('✅ Normalized "join" button payload to text message with tenant context');
    }
    
    // Normalize button to text message for unified handling
    if (buttonText.includes('activate points') || buttonText === 'activate') {
      message.text = { body: 'activate points' };
      message.type = 'text';
      console.log('✅ Normalized "activate points" button to text message');
    } else if (buttonText.includes('menu')) {
      message.text = { body: 'menu' };
      message.type = 'text';
      console.log('✅ Normalized "menu" button to text message');
    } else if (buttonText.includes('check balance')) {
      message.text = { body: 'balance' };
      message.type = 'text';
    } else if (buttonText.includes('view rewards')) {
      message.text = { body: 'rewards' };
      message.type = 'text';
    } else if (buttonText.includes('join')) {
      // Quick reply from welcome template
      message.text = { body: 'join' };
      message.type = 'text';
    } else {
      // Unknown button, skip processing
      return;
    }
  }
  
  console.log(`📝 Message type after button processing: ${message.type}, text body: ${message.text?.body || 'none'}`);

  // Handle text messages
  if (message.type === 'text') {
    const messageText = (message.text?.body || '').toString();
    const messageTextTrimmed = messageText.trim();
    const messageTextLower = normalizeCommandText(messageTextTrimmed);

    if (!messageTextLower) {
      console.log('ℹ️ Ignoring empty text payload');
      return;
    }

    // Check for CLAIM_<vendorCode> pattern
    if (messageTextTrimmed.toUpperCase().startsWith('CLAIM_')) {
      const vendorCode = messageTextTrimmed.substring(6).trim(); // Extract vendor code after "CLAIM_"
      
      try {
        // Find tenant by vendor code
        const tenant = await prisma.tenant.findUnique({
          where: { vendorCode },
          select: { 
            id: true, 
            businessName: true,
            vendorCode: true 
          }
        });

        if (!tenant) {
          console.log(`❌ Invalid vendor code: ${vendorCode}`);
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ Invalid vendor code: ${vendorCode}\n\nPlease check the code and try again, or scan the QR code at your favorite business.`
          });
          return;
        }

        // Set this vendor as active for the customer
        await setActiveVendor(message.from, tenant.id).catch(err => 
          console.log('Note: Customer not yet registered with this vendor'));

        // Check if Flow ID is configured and available
        if (WHATSAPP_FLOW_ID && WHATSAPP_FLOW_ID !== 'YOUR_FLOW_ID_HERE') {
          // Try to send Flow message
          console.log(`📋 Sending claim flow for ${tenant.businessName} to ${message.from}`);
          const flowResult = await sendWhatsAppFlow({
            phoneNumber: message.from,
            flowId: WHATSAPP_FLOW_ID,
            businessName: tenant.businessName,
            vendorCode: tenant.vendorCode,
            currency: tenant.homeCurrency || 'GBP'
          });
          
          // If Flow fails (not published), send fallback message with instructions
          if (!flowResult.success) {
            console.log('⚠️ Flow unavailable, sending fallback message');
            await sendInteractiveButtons({
              phoneNumber: message.from,
              headerText: `${tenant.businessName}`,
              bodyText: `🎁 Submit Your Transaction - ${tenant.businessName}\n\nTo claim your loyalty points, reply with:\nAMOUNT: [number]\nDATE: [YYYY-MM-DD]\nCHANNEL: [physical_store/instagram/whatsapp]\n\nExample:\nAMOUNT: 5000\nDATE: 2025-12-28\nCHANNEL: physical_store`,
              tenantId: tenant.id,
              buttons: [
                { title: 'Submit Transaction' },
                { title: 'Menu' }
              ]
            });
          }
        } else {
          // No Flow configured - send simple instructions as interactive buttons
          console.log('⚠️ Flow not configured, sending instructions');
          await sendInteractiveButtons({
            phoneNumber: message.from,
            headerText: `${tenant.businessName}`,
            bodyText: `🎁 Submit Your Transaction - ${tenant.businessName}\n\nTo claim your loyalty points, reply with:\nAMOUNT: [number]\nDATE: [YYYY-MM-DD]\nCHANNEL: [physical_store/instagram/whatsapp]\n\nExample:\nAMOUNT: 5000\nDATE: 2025-12-28\nCHANNEL: physical_store`,
            tenantId: tenant.id,
            buttons: [
              { title: 'Submit Transaction' },
              { title: 'Menu' }
            ]
          });
        }

        return;
      } catch (error) {
        console.error('❌ Error handling CLAIM message:', error);
        return;
      }
    }

    // Check for REDEEM_<rewardId> pattern
    if (messageTextTrimmed.toUpperCase().startsWith('REDEEM_')) {
      const rewardId = messageTextTrimmed.substring(7).trim().split(/\s+/)[0]; // Extract reward ID (before first space)
      
      try {
        // Get customer from phone number
        let customer = await getActiveVendorCustomer(message.from);
        if (!customer) {
          const variants = normalizePhoneVariants(message.from);
          customer = await prisma.customer.findFirst({
            where: { phoneNumber: { in: variants }, deletedAt: null },
            include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } }
          });
        }

        if (!customer) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ You're not registered yet. Please register first with CLAIM_[VENDOR_CODE].`
          });
          return;
        }

        // Get the reward
        const reward = await prisma.reward.findUnique({
          where: { id: rewardId },
          include: { tenant: true }
        });

        if (!reward) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ Reward not found. Please check the reward ID.`
          });
          return;
        }

        // Check if reward belongs to customer's tenant
        if (reward.tenantId !== customer.tenantId) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ This reward is not available for your current business.`
          });
          return;
        }

        // Import the reward controller and call redeemReward
        const rewardController = await import('./reward.controller.js');
        const mockReq = {
          tenantId: customer.tenantId,
          user: { tenantId: customer.tenantId },
          params: { id: rewardId },
          body: { customerId: customer.id },
          headers: {
            'x-idempotency-key': `whatsapp_${message.from}_${rewardId}_${Date.now()}`,
            'x-suppress-whatsapp': 'true'
          }
        };

        let redemptionResult = null;
        let redemptionError = null;

        const mockRes = {
          status: (code) => ({
            json: async (data) => {
              if (code === 200 || code === 201) {
                redemptionResult = data;
              } else {
                redemptionError = data.error || 'Unknown error';
              }
            }
          }),
          json: async (data) => {
            if (data.success) {
              redemptionResult = data;
            } else {
              redemptionError = data.error || 'Unknown error';
            }
          }
        };

        await rewardController.redeemReward(mockReq, mockRes);

        if (redemptionError) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ ${redemptionError}\n\nPlease check your balance and try again.`
          });
        } else if (redemptionResult) {
          const code = redemptionResult.data?.redemption?.redemptionCode || 'N/A';
          const balance = redemptionResult.data?.updatedBalance?.currentBalance || 0;
          const rewardName = reward?.name || 'Reward';
          const caption = `🎉 Redemption Successful!\n\n🎁 ${rewardName}\n🎟️ Code: ${code}\n\nShow this QR code or send the above code to the business to confirm and fulfill your reward.`;
            const redemptionId = redemptionResult.data?.redemption?.id;
            let delivered = false;
          try {
            const qrUrl = await generateRedemptionQrImage({
              code,
              validUntil: reward?.validUntil || null
            });
              const imageResult = await sendWhatsAppImage({
              phoneNumber: message.from,
              imageUrl: qrUrl,
              caption,
              tenantId: customer.tenantId
            });
              if (!imageResult?.success) {
                throw new Error(imageResult?.error || 'WhatsApp image send failed');
              }
              delivered = true;
          } catch (qrError) {
            console.error('❌ Failed to send redemption QR image:', qrError);
              const textResult = await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `🎉 Redemption Successful!\n\n🎁 ${rewardName}\n🎟️ Code: ${code}\n\nShow this message or send the above code to ${customer.tenant.businessName} to confirm and fulfill your reward.`
            });
              if (textResult?.success) {
                delivered = true;
              }
          }
            if (!delivered) {
              await cancelRedemptionWithRefund({
                redemptionId,
                tenantId: customer.tenantId,
                reason: 'WhatsApp delivery failed'
              });
            }
        }
      } catch (error) {
        console.error('❌ Error processing REDEEM message:', error);
        await sendWhatsAppMessage({
          phoneNumber: message.from,
          message: `❌ Error processing redemption. Please try again later.`
        });
      }
      return;
    }

    // Check for structured claim format (AMOUNT/DATE/CHANNEL)
    if (messageTextTrimmed.toUpperCase().includes('AMOUNT:') && messageTextTrimmed.toUpperCase().includes('DATE:') && messageTextTrimmed.toUpperCase().includes('CHANNEL:')) {
      try {
        // Parse the message
        const amountMatch = messageTextTrimmed.match(/AMOUNT:\s*(\d+)/i);
        const dateMatch = messageTextTrimmed.match(/DATE:\s*([\d-]+)/i);
        const channelMatch = messageTextTrimmed.match(/CHANNEL:\s*(\w+)/i);

        if (!amountMatch || !dateMatch || !channelMatch) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ Invalid format. Please use:\n\nAMOUNT: [number]\nDATE: [YYYY-MM-DD]\nCHANNEL: [physical_store/instagram/whatsapp]`
          });
          return;
        }

        const parsedMajor = parseInt(amountMatch[1], 10);
        const purchaseDate = dateMatch[1];
        const channel = channelMatch[1].toLowerCase();

        // Prefer the active vendor customer (the business the user switched to)
        let customer = await getActiveVendorCustomer(message.from);
        // Fall back to a simple lookup if no active vendor context exists
        if (!customer) {
          const variants = normalizePhoneVariants(message.from);
          customer = await prisma.customer.findFirst({
            where: {
              phoneNumber: { in: variants },
              deletedAt: null
            },
            select: {
              id: true,
              tenantId: true,
              tenant: {
                select: {
                  vendorCode: true,
                  businessName: true,
                  homeCurrency: true
                }
              }
            }
          });
        }

        if (!customer) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ You're not registered with any business yet.\n\nPlease send CLAIM_[VENDOR_CODE] first, or visit the business in-store to register.`
          });
          return;
        }

        // Determine minor scale from tenant home currency and convert major -> minor
        const currency = customer.tenant?.homeCurrency || 'NGN';
        // All supported currencies have 100 minor units
        const minorScale = 100;
        const amountMinor = Math.round(parsedMajor * minorScale);

        console.log(`📝 Processing claim submission from ${message.from}: ${currency} ${parsedMajor} (minor: ${amountMinor}) on ${purchaseDate}`);

        // Submit the claim using the existing purchaseClaim controller logic
        const submitClaimModule = await import('./purchaseClaim.controller.js');

        // Create a mock request/response for the controller
        const mockReq = {
          body: {
            phoneNumber: ensurePlus(message.from),
            amountNgn: amountMinor,
            purchaseDate,
            channel,
            vendorCode: customer.tenant.vendorCode
          }
        };

        const mockRes = {
          status: (code) => ({
            json: async (data) => {
              if (code === 201) {
                // Success - claim submitted (confirmation already sent by purchaseClaim controller)
                console.log('✅ Claim submitted successfully');
              } else {
                // Error
                await sendWhatsAppMessage({
                  phoneNumber: message.from,
                  message: `❌ ${data.error}\n\nPlease try again or contact us in-store.`
                });
              }
            }
          }),
          json: async (data) => {
            // Handle errors without status
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ ${data.error || 'Failed to submit claim'}\n\nPlease try again or contact us in-store.`
            });
          }
        };

        await submitClaimModule.submitClaim(mockReq, mockRes);
        return;

      } catch (error) {
        console.error('❌ Error processing structured claim:', error);
        await sendWhatsAppMessage({
          phoneNumber: message.from,
          message: `❌ Error processing your claim. Please try again or contact us in-store.`
        });
        return;
      }
    }

    // Handle "activate points" or "join" quick reply to opt-in and show menu
    if (messageTextLower === 'activate points' || messageTextLower === 'activate' || messageTextLower === 'activate rewards' || messageTextLower === 'join') {
      console.log('⚡ activate points handler start for', message.from);
      try {
        let customer = await getActiveVendorCustomer(message.from);
        console.log('activate points: active customer lookup result', customer?.id, 'tenant', customer?.tenantId);

        if (!customer) {
          // If multiple vendors with no active one, pick the one that just sent the welcome (not opted in, bonus enabled)
          const variants = normalizePhoneVariants(message.from);
          const candidates = await prisma.customer.findMany({
            where: { phoneNumber: { in: variants }, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { tenant: { select: { id: true, businessName: true, settings: true } } }
          });

          console.log('activate points: candidate customers', candidates.map(c => ({ id: c.id, tenantId: c.tenantId, optedIn: c.optedIn })));

          if (candidates.length === 0) {
            await sendWhatsAppMessage({ phoneNumber: message.from, message: `❌ We couldn't find your account. Please register first with CLAIM_[VENDOR_CODE].` });
            return;
          }

          // Prefer the candidate that is NOT opted in yet (the one that just got welcome message)
          // This ensures when a phone is registered with multiple tenants, we respond with the right one
          const notOptedInCandidate = candidates.find(c => !c.optedIn);
          customer = notOptedInCandidate || candidates[0];
          
          console.log('activate points: selected customer', customer.id, 'tenantId', customer.tenantId, 'opted in?', customer.optedIn);
          await setActiveVendor(message.from, customer.tenantId);
          console.log('activate points: set active vendor to', customer.tenantId);
        }

        // Check if already opted in
        if (customer.optedIn) {
          // Already activated - just show menu
          await sendInteractiveButtons({
            phoneNumber: message.from,
            bodyText: `Your *${customer.tenant.businessName}* loyalty points are already active! 🎉\n\nWhat would you like to do next?`,
            tenantId: customer.tenantId,
            buttons: [
              { title: '💎 Check Balance' },
              { title: '🎁 View Rewards' },
              { title: '📝 Submit Transaction' }
            ]
          });
        } else {
          // New opt-in - update and send welcome message with menu
          await prisma.customer.update({
            where: { id: customer.id },
            data: { optedIn: true, optedInAt: new Date() }
          });

          await sendInteractiveButtons({
            phoneNumber: message.from,
            bodyText: `✅ You're in!\n\nYour *${customer.tenant.businessName}* loyalty points are now active.\nWe'll only message you when there's something useful for you.\n\nWhat would you like to do next?`,
            tenantId: customer.tenantId,
            buttons: [
              { title: '💎 Check Balance' },
              { title: '🎁 View Rewards' },
              { title: '📝Submit Transaction' }
            ]
          });
        }
        return;
      } catch (error) {
        console.error('❌ Error handling activate points:', error);
        await sendWhatsAppMessage({ phoneNumber: message.from, message: '❌ Something went wrong while activating. Please try again.' });
        return;
      }
    }

    // Handle STOP/unsubscribe commands - WhatsApp policy compliance
    if (messageTextLower === 'stop' || messageTextLower === 'unsubscribe' || messageTextLower === 'optout' || messageTextLower === 'opt out' || messageTextLower === 'opt-out') {
      try {
        const variants = normalizePhoneVariants(message.from);
        const allCustomers = await prisma.customer.findMany({
          where: { phoneNumber: { in: variants }, deletedAt: null },
          include: { tenant: { select: { id: true, businessName: true } } }
        });

        if (allCustomers.length === 0) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `You're not subscribed to any loyalty programs.\n\nNo action needed.`
          });
          return;
        }

        // Opt out all customers for this phone number
        const businessNames = allCustomers.map(c => c.tenant.businessName);
        await prisma.customer.updateMany({
          where: { id: { in: allCustomers.map(c => c.id) } },
          data: { optedIn: false, optedOutAt: new Date() }
        });

        await sendWhatsAppMessage({
          phoneNumber: message.from,
          message: `✅ Unsubscribed\n\nYou've been opted out of messages from:\n${businessNames.map(n => `• ${n}`).join('\n')}\n\nYou can rejoin anytime by sending "activate points" or scanning a QR code.`
        });
        return;
      } catch (error) {
        console.error('❌ Error handling opt-out:', error);
        await sendWhatsAppMessage({ phoneNumber: message.from, message: '❌ Something went wrong. Please try again.' });
        return;
      }
    }

    // Handle "menu" or "help" commands - show interactive buttons
    if (messageTextLower === 'menu' || messageTextLower === 'help' || messageTextLower === 'start') {
      try {
        const customer = await getActiveVendorCustomer(message.from);
        
        if (!customer) {
          // Check if registered with any vendors
          const variants = normalizePhoneVariants(message.from);
          const allCustomers = await prisma.customer.findMany({
            where: {
              phoneNumber: { in: variants },
              deletedAt: null
            },
            orderBy: { updatedAt: 'desc' },
            include: {
              tenant: { select: { id: true, businessName: true } }
            }
          });

          if (allCustomers.length > 1) {
            // Multiple vendors but no active one - show selector
            const listItems = allCustomers.map((c, idx) => ({
              id: `business_${idx}_${c.tenant.id.substring(0, 8)}`,
              title: c.tenant.businessName.substring(0, 24),
              description: `Select to interact with ${c.tenant.businessName}`
            }));
            
            await sendInteractiveList({
              phoneNumber: message.from,
              bodyText: '📱 You\'re registered with multiple businesses. Which one would you like to interact with?',
              buttonText: 'Choose Business',
              sections: [{ title: 'Your Businesses', rows: listItems }]
            });
            return;
          } else if (allCustomers.length === 0) {
            // Not registered anywhere - send welcome with Menu button
            await sendInteractiveButtons({
              phoneNumber: message.from,
              headerText: 'Welcome to Pointara',
              bodyText: '👋 Welcome to Pointara!\n\nTo get started, scan the QR code at your favorite business or send CLAIM_[VENDOR_CODE]',
              buttons: [
                { title: 'Menu' },
                { title: 'Help' }
              ]
            });
            return;
          }
        }

        if (customer) {
          // Check if customer has multiple businesses
          const variants = normalizePhoneVariants(message.from);
          const customerCount = await prisma.customer.count({
            where: {
              phoneNumber: { in: variants },
              deletedAt: null
            }
          });

          const hasMultipleBusinesses = customerCount > 1;

          if (hasMultipleBusinesses) {
            // Use list menu for multi-business users (supports 4+ options)
            await sendInteractiveList({
              phoneNumber: message.from,
              headerText: customer.tenant.businessName,
              bodyText: 'Welcome back! What would you like to do?',
              tenantId: customer.tenant.id,
              buttonText: 'Menu',
              sections: [{
                title: 'Actions',
                rows: [
                  { id: 'balance', title: '💎 Check Balance', description: 'View your points balance' },
                  { id: 'rewards', title: '🎁 View Rewards', description: 'See available rewards' },
                  { id: 'claim', title: '📝 Submit Transaction', description: 'Submit a new transaction claim' },
                  { id: 'switch', title: '🔄 Switch Business', description: 'Change active business' }
                ]
              }]
            });
            // pass tenantId for localization
          } else {
            // Use buttons for single-business users (cleaner UX)
            await sendInteractiveButtons({
              phoneNumber: message.from,
              headerText: customer.tenant.businessName,
              bodyText: 'Welcome back! What would you like to do?',
              tenantId: customer.tenant.id,
              buttons: [
                { title: '💎 Check Balance' },
                { title: '🎁 View Rewards' },
                { title: '📝 Submit Transaction' }
              ]
            });
          }
        }
        return;
      } catch (error) {
        console.error('❌ Error showing menu:', error);
        return;
      }
    }

    // Handle "businesses" or "switch" command
    if (messageTextLower === 'businesses' || messageTextLower === 'switch' || messageTextLower === 'vendors') {
      try {
        const variants = normalizePhoneVariants(message.from);
        const allCustomers = await prisma.customer.findMany({
          where: {
            phoneNumber: { in: variants },
            deletedAt: null
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            tenant: {
              select: {
                id: true,
                businessName: true,
                vendorCode: true
              }
            },
            pointsBalance: {
              select: {
                currentBalance: true
              }
            }
          }
        });

        if (allCustomers.length === 0) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `❌ You're not registered with any businesses yet.\n\nSend CLAIM_[VENDOR_CODE] to get started!`
          });
          return;
        }

        if (allCustomers.length === 1) {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `📱 You're only registered with ${allCustomers[0].tenant.businessName}.\n\nTo join another business, scan their QR code or send CLAIM_[VENDOR_CODE]`
          });
          return;
        }

        // Multiple businesses - show list
        const listItems = allCustomers.map((c, idx) => {
          const isActive = c.conversationState?.activeVendor === true;
          const points = c.pointsBalance?.currentBalance || 0;
          const titlePrefix = isActive ? '✓ ' : '';
          const businessName = c.tenant.businessName;
          const maxLength = 24 - titlePrefix.length;
          
          return {
            id: `business_${idx}_${c.tenant.id.substring(0, 8)}`,
            title: `${titlePrefix}${businessName.substring(0, maxLength)}`,
            description: `${points} points${isActive ? ' (Active)' : ''}`
          };
        });

        await sendInteractiveList({
          phoneNumber: message.from,
          bodyText: `📱 Your Businesses (${allCustomers.length})\n\nSelect a business to make it active for menu, balance, and rewards commands.`,
          buttonText: 'Switch Business',
          sections: [{ title: 'Your Businesses', rows: listItems }]
        });
        return;
      } catch (error) {
        console.error('❌ Error showing businesses:', error);
        return;
      }
    }

    // Handle "claim", "submit", "submit claim", or "submit transaction" commands
    if (messageTextLower === 'claim' || messageTextLower === 'submit' || messageTextLower === 'submit claim' || messageTextLower === '📝 submit claim' || messageTextLower === 'submit transaction' || messageTextLower === '📝 submit transaction') {
      try {
        const customer = await getActiveVendorCustomer(message.from);

        if (!customer) {
          // Check if they have multiple vendors
          const variants = normalizePhoneVariants(message.from);
          const allCustomers = await prisma.customer.findMany({
            where: {
              phoneNumber: { in: variants },
              deletedAt: null
            },
            orderBy: { updatedAt: 'desc' },
            include: {
              tenant: { select: { id: true, businessName: true } }
            }
          });

          if (allCustomers.length > 1) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ Multiple businesses found.\n\nSend 'businesses' to select which one you want to submit a claim for.`
            });
            return;
          } else if (allCustomers.length === 0) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ You're not registered yet.\n\nPlease scan the QR code at your favorite business or send CLAIM_[VENDOR_CODE] to get started!`
            });
            return;
          }
        }

        // Customer is registered - show them claim instructions
        console.log(`📋 ${message.from} requested claim form for ${customer.tenant.businessName}`);
        
        // Try Flow first, fallback to text
        if (WHATSAPP_FLOW_ID && WHATSAPP_FLOW_ID !== 'YOUR_FLOW_ID_HERE') {
          const flowResult = await sendWhatsAppFlow({
            phoneNumber: message.from,
            flowId: WHATSAPP_FLOW_ID,
            businessName: customer.tenant.businessName,
            vendorCode: customer.tenant.vendorCode,
            currency: customer.tenant.homeCurrency || 'GBP'
          });
          
          if (!flowResult.success) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `🎁 Submit Your Transaction - ${customer.tenant.businessName}\n\nTo claim your loyalty points, reply with:\n\nAMOUNT: [transaction amount]\nDATE: [transaction date]\nCHANNEL: [physical_store/instagram/whatsapp]\n\nExample:\nAMOUNT: 5000\nDATE: 2025-12-28\nCHANNEL: physical_store`
            });
          }
        } else {
          await sendWhatsAppMessage({
            phoneNumber: message.from,
            message: `🎁 Submit Your Transaction - ${customer.tenant.businessName}\n\nTo claim your loyalty points, reply with:\n\nAMOUNT: [transaction amount]\nDATE: [transaction date]\nCHANNEL: [physical_store/instagram/whatsapp]\n\nExample:\nAMOUNT: 5000\nDATE: 2025-12-28\nCHANNEL: physical_store`
          });
        }
        return;
      } catch (error) {
        console.error('❌ Error handling claim command:', error);
        return;
      }
    }

    // Simple command handling
    if (messageTextLower.includes('balance') || messageTextLower === 'bal' || messageTextLower === '💎 check balance') {
      try {
        const customer = await getActiveVendorCustomer(message.from);

        if (!customer) {
          const variants = normalizePhoneVariants(message.from);
          const allCustomers = await prisma.customer.findMany({
            where: {
              phoneNumber: { in: variants },
              deletedAt: null
            },
            orderBy: { updatedAt: 'desc' },
            include: {
              tenant: { select: { id: true, businessName: true } }
            }
          });

          if (allCustomers.length > 1) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ Multiple businesses found.\n\nSend 'businesses' to select which balance you want to check.`
            });
            return;
          } else if (allCustomers.length === 0) {
            await sendWhatsAppMessage({
              phoneNumber: message.from,
              message: `❌ You're not registered yet.\n\nPlease scan the QR code at your favorite business or send CLAIM_[VENDOR_CODE] to get started!`
            });
            return;
          }
        }

        // Get points balance
        const balance = await prisma.customerPointsBalance.findUnique({
          where: {
            tenantId_customerId: {
              tenantId: customer.tenantId,
              customerId: customer.id
            }
          },
          select: {
            totalPointsEarned: true,
            totalPointsRedeemed: true,
            currentBalance: true
          }
        });

        const currentBalance = balance?.currentBalance || 0;
        const totalEarned = balance?.totalPointsEarned || 0;
        const totalRedeemed = balance?.pointsRedeemed || 0;

        await sendInteractiveButtons({
          phoneNumber: message.from,
          headerText: `${customer.tenant.businessName}`,
          bodyText: `💎 Your Points Balance\n\n✨ Current Balance: ${currentBalance} points\n📈 Total Earned: ${totalEarned} points`,
          tenantId: customer.tenantId,
          buttons: [
            { title: '🎁 View Rewards' }
          ]
        });
        return;
      } catch (error) {
        console.error('❌ Error checking balance:', error);
        await sendWhatsAppMessage({
          phoneNumber: message.from,
          message: `❌ Error checking balance. Please try again later.`
        });
        return;
      }
    } else if (messageTextLower.includes('rewards') || messageTextLower === 'r' || messageTextLower === 'view rewards') {
      try {
        // Find active vendor context or fallback to a single-tenant association
        let customer = await getActiveVendorCustomer(message.from);
        if (!customer) {
          const variants = normalizePhoneVariants(message.from);
          customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, deletedAt: null }, include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } } });
        }

        if (!customer) {
          await sendWhatsAppMessage({ phoneNumber: message.from, message: `You're not registered with any business yet. Send CLAIM_[VENDOR_CODE] or visit in-store to register.` });
          return;
        }

        await sendRewardsListPage({ customer, phoneNumber: message.from, page: 0 });
        return;
      } catch (error) {
        console.error('Error showing rewards:', error);
        // Fallback to plaintext list if interactive fails
        try {
          let customer = await getActiveVendorCustomer(message.from);
          if (!customer) {
            const variants = normalizePhoneVariants(message.from);
            customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, deletedAt: null }, include: { tenant: { select: { id: true, businessName: true, homeCurrency: true } } } });
          }
          if (customer) {
            const rewards = await prisma.reward.findMany({ where: { tenantId: customer.tenantId, deletedAt: null, isActive: true }, orderBy: { createdAt: 'desc' }, take: 50 });
            if (rewards && rewards.length > 0) {
              const fallbackLines = rewards.slice(0, 10).map(r => {
                const pts = r.pointsRequired ?? r.points_required ?? 0;
                return `- ${r.name} — ${pts} pts`;
              }).join('\n');
              await sendWhatsAppMessage({ phoneNumber: message.from, tenantId: customer.tenantId, message: `Available Rewards at ${customer.tenant.businessName}:\n\n${fallbackLines}\n\nReply with MENU for options.` });
            }
          }
        } catch (e2) {
          console.error('Error sending fallback rewards:', e2);
          await sendWhatsAppMessage({ phoneNumber: message.from, message: 'Failed to fetch rewards. Please try again later.' });
        }
      }
    } else {
      // Fallback for unrecognized commands or messages after long inactivity
      console.log(`ℹ️ Unrecognized message: "${messageTextLower}"`);
      
      try {
        // Check if registered with any business
        const variants = normalizePhoneVariants(message.from);
        const allCustomers = await prisma.customer.findMany({
          where: {
            phoneNumber: { in: variants },
            deletedAt: null
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            tenant: { select: { id: true, businessName: true } }
          }
        });

        if (allCustomers.length > 1) {
          // Multiple businesses - use active vendor or most recently updated
          const customer = await getActiveVendorCustomer(message.from);
          console.log(`ℹ️ Multi-tenant user, routing to: ${customer?.tenant?.businessName || 'none'}`);
          
          await sendInteractiveList({
            phoneNumber: message.from,
            headerText: customer.tenant.businessName,
            bodyText: `👋 I didn't understand that. Choose an option below.`,
            tenantId: customer.tenantId,
            buttonText: 'Menu',
            sections: [{
              title: 'Actions',
              rows: [
                { id: 'balance', title: '💎 Check Balance', description: 'View your points balance' },
                { id: 'rewards', title: '🎁 View Rewards', description: 'See available rewards' },
                { id: 'claim', title: '📝 Submit Transaction', description: 'Submit a new transaction claim' },
                { id: 'switch', title: '🔄 Switch Business', description: 'Change active business' }
              ]
            }]
          });
          return;
        } else if (allCustomers.length === 1) {
          // Single business - show action buttons
          const customer = allCustomers[0];
          await sendInteractiveButtons({
            phoneNumber: message.from,
            headerText: customer.tenant.businessName,
            bodyText: `👋 Welcome back!\n\nI didn't quite understand that. Choose an option below.`,
            tenantId: customer.tenantId,
            buttons: [
              { title: '💎 Check Balance' },
              { title: '🎁 View Rewards' },
              { title: '📝 Submit Claim' }
            ]
          });
        } else {
          // User not registered - show menu button with getting started message
          await sendInteractiveButtons({
            phoneNumber: message.from,
            bodyText: `👋 Welcome!\n\nI didn't recognize that command. Tap the button below to get started.`,
            buttons: [
              { title: 'Menu' }
            ]
          });
        }
      } catch (error) {
        console.error('❌ Error in fallback response:', error);
        // Generic fallback if database lookup fails
        await sendInteractiveButtons({
          phoneNumber: message.from,
          bodyText: `👋 I didn't understand that. Tap below to see options.`,
          buttons: [
            { title: 'Menu' }
          ]
        });
      }
    }
  }

  // Handle button responses (simple button type - newer WhatsApp format)
  if (message.type === 'button') {
    const buttonText = (message.button?.text || '').toLowerCase();
    console.log(`🔘 Button: ${message.button?.text || 'unknown'}`);
    
    // Normalize button to text message for unified handling
    if (buttonText.includes('activate points') || buttonText === 'activate') {
      message.text = { body: 'activate points' };
      message.type = 'text';
      console.log('✅ Normalized "activate points" button to text message');
      // Fall through to text handling below
    } else if (buttonText.includes('menu')) {
      message.text = { body: 'menu' };
      message.type = 'text';
      console.log('✅ Normalized "menu" button to text message');
      // Fall through to text handling below
    } else if (buttonText.includes('check balance')) {
      message.text = { body: 'balance' };
      message.type = 'text';
      // Fall through
    } else if (buttonText.includes('view rewards')) {
      message.text = { body: 'rewards' };
      message.type = 'text';
      // Fall through
    } else {
      // Unknown button, just return
      return;
    }
  }
  
  console.log(`📝 Message type after button processing: ${message.type}, text body: ${message.text?.body || 'none'}`);

  // TODO: Store message in database
  // await prisma.whatsAppMessage.create({ ... });
}

// Handle message status updates
function handleStatusUpdate(status, metadata) {
  // Only log failed status updates
  if (status.status === 'failed') {
    console.error(`❌ Message ${status.id} failed to ${status.recipient_id}`);
    try {
      console.error('❌ Full status payload:', JSON.stringify(status, null, 2));
    } catch (e) {
      console.error('❌ Failed to stringify status payload', e);
      console.error('Status object:', status);
    }

    // Determine recipient phone
    try {
      const recipient = status.recipient_id || (metadata && metadata.display_phone_number) || null;
      if (!recipient) return;

      // If failure is due to re-engagement (outside 24-hour window), try sending a pre-approved template (HSM)
      const hasReengageError = Array.isArray(status.errors) && status.errors.some(err => Number(err.code) === 131047 || String(err.code) === '131047');
      if (hasReengageError) {
        // Attempt template HSM fallback first
        console.log('ℹ️ Detected re-engagement failure (131047). Attempting template HSM fallback.');
        const templateName = process.env.WHATSAPP_REENGAGE_TEMPLATE || process.env.WHATSAPP_TEMPLATE_NAME || 'welcome_bonus_message';
        const language = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

        sendTemplateMessage({ phoneNumber: recipient, templateName, language }).then((r) => {
          if (!r || !r.success) {
            console.warn('⚠️ Template fallback failed for re-engagement window:', r?.error || r);
          } else {
            console.log('✅ Template fallback sent successfully (or logged).');
          }
        }).catch((e) => {
          console.warn('⚠️ Template fallback error during re-engagement handling:', e);
        });
      } else {
        // Generic failure: send plaintext fallback
        sendWhatsAppMessage({ phoneNumber: recipient, message: `Sorry — we couldn't deliver the interactive content. Reply REWARDS to try again, or type MENU for options.` }).catch(err => console.warn('⚠️ Failed to send delivery-fallback message', err));
      }
    } catch (e) {
      console.warn('⚠️ Error while attempting to send delivery fallback:', e);
    }
  }

  // TODO: Update message status in database
  // await prisma.whatsAppMessage.update({ ... });
}
