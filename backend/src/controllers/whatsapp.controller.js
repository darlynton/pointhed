import { sendWhatsAppMessage, sendInteractiveButtons } from '../services/whatsapp.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/v1/whatsapp/instant
export const sendInstant = async (req, res, next) => {
  try {
    const { phoneNumber, tenantId } = req.body || {};
    
    console.log('📱 Instant request received:', { phoneNumber, tenantId });
    
    if (!phoneNumber) {
      console.log('❌ No phone number provided');
      return res.status(400).json({ success: false, error: 'phoneNumber is required' });
    }

    // Parse phone number to extract country code and raw number
    // Match patterns like +447404938935 or +1234567890
    const phoneMatch = phoneNumber.match(/^(\+\d{1,3})(\d{4,})$/);
    const countryCode = phoneMatch ? phoneMatch[1] : '+44';
    const rawNumber = phoneMatch ? phoneMatch[2] : phoneNumber.replace(/^\+|[^\d]/g, '');

    // Check if this phone number already requested instant demo
    const existingLead = await prisma.whatsAppLead.findFirst({
      where: { phoneNumber }
    });

    if (existingLead) {
      console.log('📱 Phone already requested instant demo:', existingLead.createdAt);
      return res.status(200).json({ 
        success: true,
        alreadyRequested: true,
        message: 'Demo already sent to this number',
        firstRequestedAt: existingLead.createdAt
      });
    }

    // Get current waitlist position (before adding this lead)
    const currentPosition = await prisma.whatsAppLead.count() + 1;

    // Use simple text message for better compatibility and faster delivery
    const message = `🎉 Pointhed — Instant Experience

Hi! This message is sent from Pointhed's instant demo system.

✨ You're experiencing our live WhatsApp integration
📱 This is the actual platform in action  
🚀 Reply "START" to explore interactive features

📊 You are number ${currentPosition} on the waitlist!

Ready to transform your customer engagement?

Powered by Pointhed`;

    console.log('📱 Sending instant message to:', phoneNumber);

    const result = await sendWhatsAppMessage({
      phoneNumber,
      message,
      tenantId: tenantId || null
    });

    console.log('📱 Send result:', result);

    if (result?.success) {
      // Save to database and get position
      const lead = await prisma.whatsAppLead.create({
        data: {
          phoneNumber,
          countryCode,
          rawNumber,
          source: 'landing_page',
          status: 'sent',
          messageId: result.messageId || null,
          metadata: { 
            tenantId,
            sentAt: new Date().toISOString() 
          }
        }
      }).catch(err => {
        console.error('⚠️  Failed to save WhatsApp lead:', err);
        return null;
      });

      // Get position in waitlist
      let position = null;
      if (lead) {
        position = await prisma.whatsAppLead.count({
          where: {
            createdAt: {
              lte: lead.createdAt
            }
          }
        }).catch(err => {
          console.error('⚠️  Failed to count position:', err);
          return null;
        });
        console.log('📊 WhatsApp waitlist position:', position);
      }

      return res.status(200).json({ 
        success: true, 
        result,
        messageId: result.messageId,
        alreadyRequested: !!existingLead,
        position
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result?.error || 'Failed to send message',
        status: result?.status || 'error',
        result 
      });
    }
  } catch (err) {
    console.error('📱 Error in sendInstant:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};
