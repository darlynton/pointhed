// WhatsApp Business API Integration Service
// Using Meta's Cloud API

import prisma from '../utils/prisma.js';
import path from 'path';
import fs from 'fs/promises';
import QRCode from 'qrcode';
import axios from 'axios';
import { randomUUID } from 'crypto';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''; // No-op change
// Default to approved welcome template; env override is optional but not required
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'welcome_bonus_message';
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/+$/, '');
const QR_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'qr');
const RECEIPTS_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');

// Helper to check if testMode is enabled for a tenant
const isTestModeEnabled = async (tenantId) => {
  if (!tenantId) return false;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true }
    });
    if (!tenant) return false;
    const settings = typeof tenant.settings === 'string' 
      ? JSON.parse(tenant.settings) 
      : (tenant.settings || {});
    return settings.test_mode === true;
  } catch (e) {
    console.warn('Failed to check test mode:', e);
    return false;
  }
};

// Format phone number to international format (remove spaces, dashes, ensure +)
const formatPhoneNumber = (phoneNumber) => {
  // Remove spaces, dashes, parentheses
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

const ensureQrDir = async () => {
  await fs.mkdir(QR_UPLOAD_DIR, { recursive: true });
};

const safeFileSlug = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

export const deleteRedemptionQrImage = async (code) => {
  if (!code) return;
  const fileName = `redemption-${safeFileSlug(code)}.png`;
  const filePath = path.join(QR_UPLOAD_DIR, fileName);
  try {
    await fs.unlink(filePath);
    console.log(`🧹 Deleted redemption QR image: ${fileName}`);
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.warn('⚠️ Failed to delete redemption QR image:', err?.message || err);
    }
  }
};

export const generateRedemptionQrImage = async ({ code, validUntil }) => {
  const validUntilIso = validUntil ? new Date(validUntil).toISOString() : 'NONE';
  const payload = `CODE:${code}\nVALID_UNTIL:${validUntilIso}`;

  await ensureQrDir();
  const fileName = `redemption-${safeFileSlug(code)}.png`;
  const filePath = path.join(QR_UPLOAD_DIR, fileName);

  try {
    await fs.access(filePath);
  } catch {
    await QRCode.toFile(filePath, payload, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  }

  const publicUrl = `${PUBLIC_BASE_URL}/uploads/qr/${fileName}`;

  // Validate public reachability to avoid WhatsApp media download failures (404)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const headRes = await fetch(publicUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!headRes.ok) {
      throw new Error(`Public QR URL not reachable: ${headRes.status}`);
    }
  } catch (err) {
    console.warn('⚠️  QR public URL check failed:', err?.message || err);
    throw err;
  }

  return publicUrl;
};

export const sendWhatsAppImage = async ({ phoneNumber, imageUrl, caption, tenantId }) => {
  try {
    // Check if test mode is enabled - skip actual sending
    if (tenantId && await isTestModeEnabled(tenantId)) {
      console.log('🧪 TEST MODE: WhatsApp image NOT sent (test mode enabled)');
      console.log(`To: ${phoneNumber}`);
      console.log(`Image: ${imageUrl}`);
      return {
        success: true,
        messageId: `test_${Date.now()}`,
        status: 'test_mode',
        testMode: true
      };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Image message logged only.');
      return { success: false, status: 'not_configured' };
    }

    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'image',
        image: {
          link: imageUrl,
          ...(caption ? { caption } : {})
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ WhatsApp Image API Error:', data);
      return { success: false, error: data.error?.message || 'Failed to send image', status: 'failed' };
    }

    return { success: true, messageId: data.messages?.[0]?.id, status: 'sent', whatsappResponse: data };
  } catch (error) {
    console.error('❌ WhatsApp image send error:', error);
    return { success: false, error: error.message, status: 'error' };
  }
};

export const sendWhatsAppMessage = async ({ phoneNumber, message, tenantId }) => {
  try {
    // Check if test mode is enabled - skip actual sending
    if (tenantId && await isTestModeEnabled(tenantId)) {
      console.log('🧪 TEST MODE: WhatsApp message NOT sent (test mode enabled)');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message.substring(0, 100)}...`);
      return {
        success: true,
        messageId: `test_${Date.now()}`,
        status: 'test_mode',
        testMode: true
      };
    }

    // Localize message amounts if tenantId provided
    let localizedMessage = message;
    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true } });
        const homeCurrency = (tenant && tenant.homeCurrency) || 'NGN';
        // Replace {amount} or ₦{amount} placeholders with formatted currency
        if (localizedMessage.includes('{amount}') || localizedMessage.includes('₦{amount}')) {
          // For safety do not assume amount value here; caller may have included numeric amount separately.
          // We'll leave placeholder replacement to controllers when they have amount value.
        }
        // Replace raw '₦123,456' occurrences with tenant-formatted amounts
        localizedMessage = localizedMessage.replace(/₦\s*([\d,]+(?:\.\d+)?)/g, (m, p1) => {
          const num = Number(p1.replace(/,/g, ''));
          try {
            return new Intl.NumberFormat('en-GB', { style: 'currency', currency: homeCurrency, minimumFractionDigits: 0 }).format(num);
          } catch (e) {
            return `${homeCurrency} ${num}`;
          }
        });
      } catch (e) {
        console.warn('Failed to localize message amounts for tenant', tenantId, e);
      }
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log('📱 Sending WhatsApp Message:');
    console.log(`To: ${formattedPhone}`);
    console.log(`Tenant: ${tenantId}`);
    console.log(`Message: ${localizedMessage.substring(0, 100)}...`);
    console.log('WhatsApp API Token configured:', !!WHATSAPP_API_TOKEN);
    console.log('WhatsApp Phone Number ID configured:', !!WHATSAPP_PHONE_NUMBER_ID);

    // Check if credentials are configured
    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Message logged only.');
      return {
        success: false,
        messageId: `mock_${Date.now()}`,
        status: 'not_configured',
        error: 'WhatsApp API credentials not configured'
      };
    }

    console.log('📱 Making API request to WhatsApp...');

    // Send message via WhatsApp Business API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: {
              body: localizedMessage
            }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('📱 WhatsApp API response status:', response.status);

      const data = await response.json();
      console.log('📱 WhatsApp API response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('❌ WhatsApp API Error:', data);
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
          status: 'failed'
        };
      }

      console.log('✅ WhatsApp message sent successfully:', data.messages?.[0]?.id);

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        status: 'sent',
        whatsappResponse: data
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('⏰ WhatsApp API request timed out');
        return {
          success: false,
          error: 'Request timed out',
          status: 'timeout'
        };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return {
      success: false,
      error: error.message,
      status: 'error'
    };
  }
};

export const sendWelcomeMessage = async ({ phoneNumber, firstName, businessName, welcomePoints }) => {
  const bodyText = `*${businessName}*\n\nHi ${firstName}, thank you for joining our loyalty program!\n\n🎁 You've been awarded ${welcomePoints} welcome points to get you started.\n\nStart earning more points with every purchase. Your points never expire!`;

  // Try sending interactive buttons (Menu) first, fall back to text message
  const buttons = [
    { title: 'Menu' },
    { title: 'Help' }
  ];

  const interactiveResult = await sendInteractiveButtons({
    phoneNumber,
    headerText: businessName,
    bodyText,
    buttons
  });

  if (interactiveResult && interactiveResult.success) return interactiveResult;

  // Fallback to plain text
  const message = `${bodyText}\n\nReply HELP for more information.`;
  return sendWhatsAppMessage({ phoneNumber, message, tenantId: null });
};

export const sendPurchaseConfirmation = async ({ phoneNumber, firstName, amountNgn, pointsEarned, currentBalance }) => {
  const bodyText = `✅ Transaction Confirmed!\n\nHi ${firstName},\n\nYou just earned ${pointsEarned} points from your ${amountNgn} transaction!\n\n💎 Current Balance: ${currentBalance} points\n\nKeep earning more with every transaction!`;

  const buttons = [
    { title: 'Menu' }
  ];

  const interactiveResult = await sendInteractiveButtons({
    phoneNumber,
    headerText: 'Transaction Confirmed',
    bodyText,
    buttons
  });

  if (interactiveResult && interactiveResult.success) return interactiveResult;

  return sendWhatsAppMessage({ phoneNumber, message: bodyText, tenantId: null });
};

export const sendInteractiveButtons = async ({ phoneNumber, headerText, bodyText, buttons, tenantId }) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log('🔘 Sending WhatsApp Interactive Buttons:');
    console.log(`To: ${formattedPhone}`);
    console.log(`Buttons: ${buttons.length}`);

    // Localize amounts in bodyText/headerText if tenantId provided
    let localizedHeader = headerText;
    let localizedBody = bodyText;
    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true } });
        const homeCurrency = (tenant && tenant.homeCurrency) || 'NGN';
        if (typeof localizedHeader === 'string') {
          localizedHeader = localizedHeader.replace(/₦\s*([\d,]+(?:\.\d+)?)/g, (m, p1) => {
          const num = Number(p1.replace(/,/g, ''));
          try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: homeCurrency, minimumFractionDigits: 0 }).format(num); } catch (e) { return `${homeCurrency} ${num}`; }
          });
        }
        if (typeof localizedBody === 'string') {
          localizedBody = localizedBody.replace(/₦\s*([\d,]+(?:\.\d+)?)/g, (m, p1) => {
          const num = Number(p1.replace(/,/g, ''));
          try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: homeCurrency, minimumFractionDigits: 0 }).format(num); } catch (e) { return `${homeCurrency} ${num}`; }
          });
        }
      } catch (e) {
        console.warn('Failed to localize interactive message for tenant', tenantId, e);
      }
    }

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Buttons logged only.');
      return { success: false, status: 'not_configured' };
    }

    // WhatsApp supports max 3 buttons
    const buttonList = buttons.slice(0, 3).map((btn, index) => ({
      type: 'reply',
      reply: {
        id: (btn && btn.id) ? String(btn.id).substring(0, 256) : `btn_${index}_${Date.now()}`,
        title: (btn && btn.title) ? String(btn.title).substring(0, 20) : `Option ${index + 1}` // Max 20 chars
      }
    }));

    // Build interactive payload (supports text or image header via optional headerText object)
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: localizedHeader && typeof localizedHeader === 'object' && localizedHeader.type === 'image' ?
              { type: 'image', image: { link: localizedHeader.imageUrl } } :
              (localizedHeader ? { type: 'text', text: localizedHeader } : undefined),
            body: {
              text: localizedBody
            },
            action: {
              buttons: buttonList
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp Button API Error:', data);
      try {
        const fallbackMessage = `${localizedHeader && typeof localizedHeader === 'string' ? localizedHeader + '\n\n' : ''}${localizedBody || ''}\n\nReply with the option you want, or type MENU for more options.`;
        await sendWhatsAppMessage({ phoneNumber: formattedPhone, message: fallbackMessage, tenantId });
      } catch (e) {
        console.warn('⚠️ Failed to send plaintext fallback after button send failure', e?.message || e);
      }
      return { success: false, error: data.error?.message, whatsappResponse: data };
    }

    console.log('✅ Interactive buttons sent:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id, whatsappResponse: data };
  } catch (error) {
    console.error('❌ Error sending buttons:', error);
    try {
      const fallbackMessage = `${headerText && typeof headerText === 'string' ? headerText + '\n\n' : ''}${bodyText || ''}\n\n(Automatic fallback: interactive content could not be delivered.)`;
      await sendWhatsAppMessage({ phoneNumber, message: fallbackMessage, tenantId });
    } catch (e) {
      console.warn('⚠️ Failed to send plaintext fallback after exception in button send', e?.message || e);
    }
    return { success: false, error: error.message };
  }
};

export const sendInteractiveList = async ({ phoneNumber, headerText, bodyText, buttonText, sections, tenantId }) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log('📋 Sending WhatsApp Interactive List:');
    console.log(`To: ${formattedPhone}`);

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. List logged only.');
      return { success: false, status: 'not_configured' };
    }

    // Localize body/header if tenantId provided
    let localizedHeader = headerText;
    let localizedBody = bodyText;
    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true } });
        const homeCurrency = (tenant && tenant.homeCurrency) || 'NGN';
        if (typeof localizedHeader === 'string') {
          localizedHeader = localizedHeader.replace(/₦\s*([\d,]+(?:\.\d+)?)/g, (m, p1) => {
          const num = Number(p1.replace(/,/g, ''));
          try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: homeCurrency, minimumFractionDigits: 0 }).format(num); } catch (e) { return `${homeCurrency} ${num}`; }
          });
        }
        if (typeof localizedBody === 'string') {
          localizedBody = localizedBody.replace(/₦\s*([\d,]+(?:\.\d+)?)/g, (m, p1) => {
          const num = Number(p1.replace(/,/g, ''));
          try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: homeCurrency, minimumFractionDigits: 0 }).format(num); } catch (e) { return `${homeCurrency} ${num}`; }
          });
        }
      } catch (e) {
        console.warn('Failed to localize list message for tenant', tenantId, e);
      }
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: localizedHeader ? {
              type: 'text',
              text: localizedHeader
            } : undefined,
            body: {
              text: localizedBody
            },
            action: {
              button: buttonText || 'View Options',
              sections: sections
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp List API Error:', data);
      try {
        // Build a plaintext fallback listing section rows
        let fallback = '';
        if (localizedHeader && typeof localizedHeader === 'string') fallback += localizedHeader + '\n\n';
        if (localizedBody) fallback += localizedBody + '\n\n';
        if (Array.isArray(sections)) {
          for (const s of sections) {
            if (s.title) fallback += `${s.title}\n`;
            if (Array.isArray(s.rows)) {
              for (const r of s.rows) {
                fallback += `- ${r.title || ''}`;
                if (r.description) fallback += ` — ${r.description}`;
                fallback += '\n';
              }
            }
            fallback += '\n';
          }
        }
        fallback += '\nReply with the item name to view details, or type MENU.';
        await sendWhatsAppMessage({ phoneNumber: formattedPhone, message: fallback, tenantId });
      } catch (e) {
        console.warn('⚠️ Failed to send plaintext fallback after list send failure', e?.message || e);
      }
      return { success: false, error: data.error?.message, whatsappResponse: data };
    }

    console.log('✅ Interactive list sent:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id, whatsappResponse: data };
  } catch (error) {
    console.error('❌ Error sending list:', error);
    try {
      const fallback = `${headerText && typeof headerText === 'string' ? headerText + '\n\n' : ''}${bodyText || ''}\n\n(Automatic fallback: interactive list could not be delivered.)`;
      await sendWhatsAppMessage({ phoneNumber, message: fallback, tenantId });
    } catch (e) {
      console.warn('⚠️ Failed to send plaintext fallback after exception in list send', e?.message || e);
    }
    return { success: false, error: error.message };
  }
};

// Send a carousel-like series of interactive card messages for rewards.
// WhatsApp Cloud API does not provide a direct 'carousel' without catalog setup,
// so we emulate a card per reward by sending an interactive button message with an image header for each reward.
export const sendRewardCarousel = async ({ phoneNumber, tenantId, rewards = [], headerText }) => {
  try {
    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Carousel logged only.');
      return { success: false, status: 'not_configured' };
    }

    // Limit to first 6 rewards to avoid spamming
    const items = rewards.slice(0, 6);
    for (const r of items) {
      const currency = (r.tenant && r.tenant.homeCurrency) || (tenantId ? (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true } })).homeCurrency : 'NGN');
      // All supported currencies have 100 minor units
      const minor = 100;
      const valueMajor = (r.monetaryValueNgn ?? r.monetary_value_ngn) ? Math.round((r.monetaryValueNgn ?? r.monetary_value_ngn) / minor) : null;
      const points = r.pointsRequired ?? r.points_required ?? 0;
      const body = `${r.name}\n\n${r.description || ''}\n\nPoints: ${points} pts${valueMajor ? ` • ${valueMajor} ${currency}` : ''}`;

      // If reward is linked to a catalog product (product_retailer_id), send a product message which renders as a product card/carousel in WhatsApp clients that support it.
      const productRetailerId = r.productRetailerId ?? r.product_retailer_id ?? r.raw?.product_retailer_id ?? null;
      if (productRetailerId) {
        // send a product message referencing the catalog item
        try {
          await sendProductMessage({ phoneNumber, tenantId, productRetailerId, bodyText: body });
          // small delay between product messages
          await new Promise(res => setTimeout(res, 200));
          continue;
        } catch (e) {
          console.warn('⚠️ Failed to send product message, falling back to image-card', e.message || e);
        }
      }

      // Fallback to interactive image-card per reward
      const validImage = r.imageUrl && /^https?:\/\//i.test(r.imageUrl);
      const header = validImage ? { type: 'image', imageUrl: r.imageUrl } : headerText || null;

      await sendInteractiveButtons({
        phoneNumber,
        headerText: header, // sendInteractiveButtons will detect object and use image header
        bodyText: body,
        tenantId,
        buttons: [ { id: `redeem_${r.id}`, title: 'Redeem' }, { title: 'Menu' } ]
      });

      // small delay to avoid rate limits
      await new Promise(res => setTimeout(res, 200));
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error sending reward carousel:', error);
    return { success: false, error: error.message };
  }
};

export const sendWhatsAppFlow = async ({ phoneNumber, flowId, businessName, vendorCode, currency = 'GBP', flowActionPayload = {} }) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log('📋 Sending WhatsApp Flow:');
    console.log(`To: ${formattedPhone}`);
    console.log(`Flow ID: ${flowId}`);
    console.log(`Business: ${businessName}`);
    console.log(`Currency: ${currency}`);

    // Check if credentials are configured
    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Flow message logged only.');
      return {
        success: false,
        messageId: `mock_${Date.now()}`,
        status: 'not_configured',
        error: 'WhatsApp API credentials not configured'
      };
    }

    // Map currency code to symbol
    const currencySymbols = {
      NGN: '₦',
      GBP: '£',
      USD: '$',
      EUR: '€'
    };
    const currencySymbol = currencySymbols[currency] || currency;

    // Prepare action payload with only allowed fields
    const actionPayload = {
      screen: 'CLAIM_FORM',
      data: {
        currency: `${currencySymbol} ${currency}`,
        channel_options: [
          { id: 'physical_store', title: 'Physical Store' },
          { id: 'online', title: 'Online' },
          { id: 'social_media', title: 'Social Media' },
          { id: 'other', title: 'Other' }
        ]
      }
    };

    // Send interactive Flow message via WhatsApp Business API
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'interactive',
          interactive: {
            type: 'flow',
            header: {
              type: 'text',
              text: `${businessName}`
            },
            body: {
              text: 'Click below to submit your transaction and earn loyalty points!\n\n⏰ Transactions must be submitted within 7 days.'
            },
            action: {
              name: 'flow',
              parameters: {
                flow_message_version: '3',
                flow_token: `${vendorCode}`,
                flow_id: flowId,
                flow_cta: 'Submit Transaction',
                flow_action: 'navigate',
                flow_action_payload: actionPayload
              }
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp Flow API Error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send Flow message',
        status: 'failed'
      };
    }

    console.log('✅ WhatsApp Flow message sent:', data.messages?.[0]?.id);
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      status: 'sent',
      whatsappResponse: data
    };
  } catch (error) {
    console.error('❌ WhatsApp Flow send error:', error);
    return {
      success: false,
      error: error.message,
      status: 'error'
    };
  }
};

// Send a product/catalog message referencing an item in the WhatsApp catalog.
// This requires the business to have a catalog and the product's `product_retailer_id`.
export const sendProductMessage = async ({ phoneNumber, tenantId, productRetailerId, bodyText = '' }) => {
  try {
    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Product message logged only.');
      return { success: false, status: 'not_configured' };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'product',
      product: {
        product_retailer_id: productRetailerId,
        body: bodyText
      }
    };

    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ WhatsApp Product API Error:', data);
      return { success: false, error: data.error?.message };
    }

    console.log('✅ Product message sent:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('❌ Error sending product message:', error);
    return { success: false, error: error.message };
  }
};

// Send a pre-approved template (HSM) message for re-engagement or system notices
export const sendTemplateMessage = async ({ phoneNumber, templateName = WHATSAPP_TEMPLATE_NAME, language = WHATSAPP_TEMPLATE_LANG, components = [], tenantId = null }) => {
  try {
    // Check if test mode is enabled - skip actual sending
    if (tenantId && await isTestModeEnabled(tenantId)) {
      console.log('🧪 TEST MODE: WhatsApp template NOT sent (test mode enabled)');
      console.log(`To: ${phoneNumber} Template: ${templateName}`);
      return {
        success: true,
        messageId: `test_${Date.now()}`,
        status: 'test_mode',
        testMode: true
      };
    }

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('⚠️  WhatsApp credentials not configured. Template message logged only.');
      return { success: false, status: 'not_configured' };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: components
      }
    };

    console.log('📨 Sending WhatsApp Template:');
    console.log(`To: ${formattedPhone} Template: ${templateName} lang:${language}`);

    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ WhatsApp Template API Error:', data);
      return { success: false, error: data.error?.message || 'Template send failed', whatsappResponse: data };
    }

    console.log('✅ Template message sent:', data.messages?.[0]?.id);
    return { success: true, messageId: data.messages?.[0]?.id, whatsappResponse: data };
  } catch (error) {
    console.error('❌ Error sending template message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Download WhatsApp media file from Meta's servers
 * @param {string|object} mediaIdOrObject - Media ID or receipt object with id property
 * @returns {Promise<string|null>} - Public URL to downloaded file or null on error
 */
export const downloadWhatsAppMedia = async (mediaIdOrObject) => {
  try {
    // Extract media ID from object if needed
    let mediaId = mediaIdOrObject;
    let fileExtension = '.jpg'; // default
    
    if (typeof mediaIdOrObject === 'object' && mediaIdOrObject.id) {
      mediaId = mediaIdOrObject.id;
      // Get extension from mime_type or file_name
      if (mediaIdOrObject.mime_type) {
        const mimeTypes = {
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'application/pdf': '.pdf'
        };
        fileExtension = mimeTypes[mediaIdOrObject.mime_type] || '.jpg';
      } else if (mediaIdOrObject.file_name) {
        fileExtension = path.extname(mediaIdOrObject.file_name) || '.jpg';
      }
    }

    if (!WHATSAPP_API_TOKEN) {
      console.warn('⚠️  WhatsApp credentials not configured. Cannot download media.');
      return null;
    }

    console.log(`📥 Downloading WhatsApp media: ${mediaId}`);

    // Step 1: Get media URL from Meta
    const mediaUrlResponse = await axios.get(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );

    const mediaUrl = mediaUrlResponse.data.url;
    if (!mediaUrl) {
      console.error('❌ No media URL returned from WhatsApp');
      return null;
    }

    // Step 2: Download the actual file
    const fileResponse = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      responseType: 'arraybuffer'
    });

    // Step 3: Save to local uploads directory
    await fs.mkdir(RECEIPTS_UPLOAD_DIR, { recursive: true });
    
    const fileName = `receipt-${randomUUID()}${fileExtension}`;
    const filePath = path.join(RECEIPTS_UPLOAD_DIR, fileName);
    
    await fs.writeFile(filePath, fileResponse.data);

    // Step 4: Return public URL
    const publicUrl = `${PUBLIC_BASE_URL}/uploads/receipts/${fileName}`;
    console.log(`✅ Receipt downloaded: ${publicUrl}`);
    
    return publicUrl;

  } catch (error) {
    console.error('❌ Error downloading WhatsApp media:', error.message);
    if (error.response) {
      console.error('WhatsApp API Error:', error.response.data);
    }
    return null;
  }
};
