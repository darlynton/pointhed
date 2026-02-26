import { PrismaClient } from '@prisma/client';
import { sendWaitlistConfirmation } from '../services/email.service.js';

const prisma = new PrismaClient();

// POST /api/v1/waitlist
export const joinWaitlist = async (req, res, next) => {
  try {
    const { email, source } = req.body || {};
    
    console.log('📧 Waitlist request received:', { email, source });
    
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Strict email validation - domain must have valid TLD (2-6 chars)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('✅ Email already on waitlist');
      return res.status(200).json({ 
        success: true, 
        message: 'You are already on the waitlist',
        alreadyExists: true 
      });
    }

    // Add to waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        source: source || 'landing_page',
        status: 'pending'
      }
    });

    console.log('✅ Added to waitlist:', waitlistEntry.id);

    // Get position in waitlist
    const position = await prisma.waitlist.count({
      where: {
        createdAt: {
          lte: waitlistEntry.createdAt
        }
      }
    });

    console.log('📊 Waitlist position:', position);

    // Send confirmation email (non-blocking)
    sendWaitlistConfirmation(email, position).catch(err => {
      console.error('⚠️  Failed to send confirmation email:', err);
      // Don't fail the request if email fails
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Successfully joined the waitlist',
      id: waitlistEntry.id,
      position 
    });

  } catch (err) {
    console.error('❌ Error in joinWaitlist:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to join waitlist. Please try again.' 
    });
  }
};
