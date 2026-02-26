import prisma from '../utils/prisma.js';
import { sendWhatsAppMessage, sendInteractiveButtons, sendTemplateMessage } from '../services/whatsapp.service.js';
import { getPagination, buildPaginationResponse } from '../config/defaults.js';
import logger from '../utils/logger.js';

// List customers for a tenant
export const listCustomers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const where = {
      tenantId: req.user.tenantId,
      deletedAt: null,
      ...(search && {
        OR: [
          { phoneNumber: { contains: search } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { whatsappName: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(status && { loyaltyStatus: status })
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          pointsBalance: true,
          _count: {
            select: { purchases: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: buildPaginationResponse(total, page, limit)
    });
  } catch (error) {
    logger.error('List customers error', { error: error.message, tenantId: req.user?.tenantId });
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
};

// Get single customer
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
        deletedAt: null
      },
      include: {
        pointsBalance: true,
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        pointsTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Create customer
export const createCustomer = async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, email, whatsappName, optedIn } = req.body;

    console.log('Create customer request:', { phoneNumber, firstName, lastName, email, whatsappName });
    console.log('User:', req.user);

    // Validate required fields
    if (!phoneNumber || !firstName) {
      return res.status(400).json({ error: 'Phone number and first name are required' });
    }

    // Normalize helpers to ensure consistent storage and robust duplicate checks
    const normalizePhoneVariants = (phone) => {
      const p = (phone || '').toString().trim();
      const noPlus = p.replace(/^\+/, '');
      const withPlus = noPlus ? `+${noPlus}` : p;
      return Array.from(new Set([p, noPlus, withPlus].filter(Boolean)));
    };
    const ensurePlus = (phone) => {
      const noPlus = (phone || '').toString().trim().replace(/^\+/, '');
      return `+${noPlus}`;
    };

    // Check if customer already exists by phone number
    const existingByPhone = await prisma.customer.findFirst({
      where: {
        tenantId: req.user.tenantId,
        phoneNumber: { in: normalizePhoneVariants(phoneNumber) },
        deletedAt: null
      }
    });

    if (existingByPhone) {
      return res.status(409).json({ 
        error: 'A customer with this phone number already exists',
        field: 'phoneNumber',
        existingCustomer: {
          id: existingByPhone.id,
          name: `${existingByPhone.firstName} ${existingByPhone.lastName || ''}`.trim()
        }
      });
    }

    // Check if customer already exists by email (if provided)
    if (email) {
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          tenantId: req.user.tenantId,
          email,
          deletedAt: null
        }
      });

      if (existingByEmail) {
        return res.status(409).json({ 
          error: 'A customer with this email already exists',
          field: 'email',
          existingCustomer: {
            id: existingByEmail.id,
            name: `${existingByEmail.firstName} ${existingByEmail.lastName || ''}`.trim()
          }
        });
      }
    }

    // Get tenant settings for welcome bonus
    console.log('req.user:', JSON.stringify(req.user));
    const tenantId = req.user.tenantId || req.user.tenant_id;
    if (!tenantId) {
      console.error('❌ No tenantId found in req.user');
      return res.status(400).json({ error: 'Invalid authentication: missing tenant' });
    }
    console.log('Fetching tenant with id:', tenantId);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { 
        settings: true, 
        businessName: true,
        whatsappConfig: true 
      }
    });

    console.log('Tenant found:', tenant);

    // Read welcome bonus settings - support both snake_case and camelCase for backward compatibility
    const welcomeBonusEnabled = tenant?.settings?.welcome_bonus_enabled ?? tenant?.settings?.welcomeBonusEnabled ?? false;
    const welcomeBonusPoints = tenant?.settings?.welcome_bonus_points ?? tenant?.settings?.welcomeBonusPoints ?? Number(process.env.DEFAULT_WELCOME_POINTS || 10);

    console.log('Welcome bonus settings:', { welcomeBonusEnabled, welcomeBonusPoints });

    // Use transaction to ensure atomicity
    console.log('Starting transaction');

    const result = await prisma.$transaction(async (tx) => {
      console.log('Creating customer');
      // Create customer
      const customer = await tx.customer.create({
        data: {
          tenantId: tenantId,
          phoneNumber: ensurePlus(phoneNumber),
          firstName,
          lastName,
          email,
          whatsappName: whatsappName || firstName,
          optedIn: Boolean(optedIn),
          optedInAt: optedIn ? new Date() : null
        }
      });

      console.log('Customer created:', customer.id);

      console.log('Creating points balance');
      // Create points balance
      const pointsBalance = await tx.customerPointsBalance.create({
        data: {
          tenantId: tenantId,
          customerId: customer.id,
          currentBalance: welcomeBonusEnabled ? welcomeBonusPoints : 0,
          totalPointsEarned: welcomeBonusEnabled ? welcomeBonusPoints : 0
        }
      });

      console.log('Points balance created');

      // If welcome bonus is enabled, create a points transaction
      if (welcomeBonusEnabled && welcomeBonusPoints > 0) {
        console.log('Creating points transaction');
        await tx.pointsTransaction.create({
          data: {
            tenantId: tenantId,
            customerId: customer.id,
            transactionType: 'earned',
            points: welcomeBonusPoints,
            description: 'Welcome bonus',
            metadata: {
              awarded_by: req.user.id,
              awarded_at: new Date().toISOString()
            }
          }
        });
        console.log('Points transaction created');
      }

      // Mark this tenant as the active vendor for this phone and clear others
      const variants = normalizePhoneVariants(phoneNumber);
      await tx.customer.updateMany({
        where: { phoneNumber: { in: variants }, deletedAt: null },
        data: { conversationState: { activeVendor: false } }
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: { conversationState: { activeVendor: true } }
      });

      return { customer, pointsBalance };
    });

    console.log('Transaction completed');

    // Send WhatsApp welcome message using approved template (async, don't wait)
    console.log('Post-transaction welcome check:', { welcomeBonusEnabled, welcomeBonusPoints, customerPhone: result.customer.phoneNumber });
    const language = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
    const customerFirstName = result.customer.firstName || 'there';
    const vendorName = tenant.businessName || 'our business';

    // Choose template based on welcome bonus toggle
    const templateNameWithBonus = process.env.WHATSAPP_WELCOME_TEMPLATE || 'welcome_bonus_message';
    const templateNameNoBonus = process.env.WHATSAPP_WELCOME_NO_BONUS_TEMPLATE || 'welcome_message';

    // Always send a welcome template; only include points when bonus is enabled
    const useBonusTemplate = welcomeBonusEnabled && welcomeBonusPoints > 0;
    const templateName = useBonusTemplate ? templateNameWithBonus : templateNameNoBonus;
    const components = useBonusTemplate
      ? [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerFirstName },
              { type: 'text', text: vendorName },
              { type: 'text', text: String(welcomeBonusPoints) }
            ]
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '0',
            parameters: [
              { type: 'payload', payload: `join_${tenantId}` }
            ]
          }
        ]
      : [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerFirstName },
              { type: 'text', text: vendorName }
            ]
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '0',
            parameters: [
              { type: 'payload', payload: `join_${tenantId}` }
            ]
          }
        ];

    console.log('✅ Initiating welcome template send:', { templateName, language, phone: result.customer.phoneNumber, firstName: customerFirstName, vendorName, welcomeBonusPoints, useBonusTemplate });
    sendTemplateMessage({
      phoneNumber: result.customer.phoneNumber,
      templateName,
      language,
      components
    }).then(res => {
      console.log('✅ Welcome template send completed:', res);
    }).catch(err => {
      console.error('❌ Failed to send welcome template:', err);
    });

    res.status(201).json({
      ...result.customer,
      pointsBalance: result.pointsBalance
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, loyaltyStatus, tags, notes } = req.body;

    const customer = await prisma.customer.updateMany({
      where: {
        id,
        tenantId: req.user.tenantId,
        deletedAt: null
      },
      data: {
        firstName,
        lastName,
        email,
        loyaltyStatus,
        tags,
        notes,
        updatedAt: new Date()
      }
    });

    if (customer.count === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updated = await prisma.customer.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// Adjust customer points manually
export const adjustPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, description, adjustmentType } = req.body;
    const tenantId = req.user.tenantId;

    // Validation
    if (!points || points === 0) {
      return res.status(400).json({ error: 'Points value is required and must not be zero' });
    }

    if (!adjustmentType || !['add', 'subtract'].includes(adjustmentType)) {
      return res.status(400).json({ error: 'adjustmentType must be either "add" or "subtract"' });
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        pointsBalance: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const pointsValue = Math.abs(points);
    const actualPoints = adjustmentType === 'add' ? pointsValue : -pointsValue;

    // Check if subtraction would result in negative balance
    const currentBalance = customer.pointsBalance?.currentBalance || 0;
    if (adjustmentType === 'subtract' && currentBalance < pointsValue) {
      return res.status(400).json({ 
        error: `Insufficient points. Customer has ${currentBalance} points, cannot subtract ${pointsValue}` 
      });
    }

    // Perform adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create points transaction
      const transaction = await tx.pointsTransaction.create({
        data: {
          tenantId,
          customerId: id,
          transactionType: adjustmentType === 'add' ? 'earned' : 'redeemed',
          points: pointsValue,
          description: description || `Manual ${adjustmentType === 'add' ? 'addition' : 'deduction'} by admin`,
          metadata: {
            adjustmentType,
            adjustedBy: req.user.id,
            adjustedByEmail: req.user.email
          },
          createdByUserId: req.user.id
        }
      });

      // Update or create points balance
      let pointsBalance;
      if (customer.pointsBalance) {
        pointsBalance = await tx.customerPointsBalance.update({
          where: {
            tenantId_customerId: {
              tenantId,
              customerId: id
            }
          },
          data: {
            currentBalance: currentBalance + actualPoints,
            ...(adjustmentType === 'add' && {
              totalPointsEarned: customer.pointsBalance.totalPointsEarned + pointsValue,
              lastEarnedAt: new Date()
            }),
            ...(adjustmentType === 'subtract' && {
              totalPointsRedeemed: customer.pointsBalance.totalPointsRedeemed + pointsValue,
              lastRedeemedAt: new Date()
            })
          }
        });
      } else {
        // Create new balance if doesn't exist
        pointsBalance = await tx.customerPointsBalance.create({
          data: {
            tenantId,
            customerId: id,
            currentBalance: adjustmentType === 'add' ? pointsValue : 0,
            totalPointsEarned: adjustmentType === 'add' ? pointsValue : 0,
            totalPointsRedeemed: adjustmentType === 'subtract' ? pointsValue : 0,
            lastEarnedAt: adjustmentType === 'add' ? new Date() : null,
            lastRedeemedAt: adjustmentType === 'subtract' ? new Date() : null
          }
        });
      }

      return { transaction, pointsBalance };
    });

    // Send WhatsApp notification if customer is opted in
    if (customer.optedIn) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessName: true }
      });

      const pointsAdjustmentText = adjustmentType === 'add' ? `+${pointsValue}` : `-${pointsValue}`;
      const reason = description || `Manual ${adjustmentType} by admin`;

      console.log('🔔 Attempting to send WhatsApp points_update template to:', customer.phoneNumber);
      // Send points_update template with adjustment details
      sendTemplateMessage({
        phoneNumber: customer.phoneNumber,
        templateName: 'points_update',
        language: 'en',
        components: [
          {
            type: 'header',
            parameters: [
              { type: 'text', text: tenant.businessName }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: pointsAdjustmentText },
              { type: 'text', text: reason },
              { type: 'text', text: String(result.pointsBalance.currentBalance) }
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
      }).then(result => {
        if (result.success) {
          console.log('✅ Points update template sent successfully:', result.messageId);
        } else {
          console.error('❌ Points update template failed:', result.error || result.status);
        }
      }).catch(err => {
        console.error('❌ Failed to send points_update template:', err);
        // Don't fail the request if WhatsApp fails
      });
    }

    res.json({
      message: 'Points adjusted successfully',
      transaction: result.transaction,
      newBalance: result.pointsBalance.currentBalance
    });
  } catch (error) {
    console.error('Adjust points error:', error);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
};

// Block/unblock customer
export const blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { block, reason } = req.body;
    const tenantId = req.user.tenantId;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update customer status
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        loyaltyStatus: block ? 'blocked' : 'active',
        notes: block 
          ? `${customer.notes || ''}\n[${new Date().toISOString()}] Blocked: ${reason || 'No reason provided'}`
          : customer.notes
      },
      include: {
        pointsBalance: true
      }
    });

    res.json({
      message: block ? 'Customer blocked successfully' : 'Customer unblocked successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Block customer error:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
};

// Delete customer (soft delete)
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.updateMany({
      where: {
        id,
        tenantId: req.user.tenantId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    if (customer.count === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// Bulk import customers from CSV data
export const bulkImportCustomers = async (req, res) => {
  try {
    const { customers } = req.body;
    const tenantId = req.user.tenantId;

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'No customers provided for import' });
    }

    // Security: Limit bulk import size to prevent abuse
    const MAX_IMPORT_SIZE = 500;
    if (customers.length > MAX_IMPORT_SIZE) {
      return res.status(400).json({ 
        error: `Maximum ${MAX_IMPORT_SIZE} customers can be imported at once`,
        received: customers.length
      });
    }

    // Normalize phone number helper
    const normalizePhoneVariants = (phone) => {
      const p = (phone || '').toString().trim();
      const noPlus = p.replace(/^\+/, '');
      const withPlus = noPlus ? `+${noPlus}` : p;
      return Array.from(new Set([p, noPlus, withPlus].filter(Boolean)));
    };

    const ensurePlus = (phone) => {
      const noPlus = (phone || '').toString().trim().replace(/^\+/, '');
      return `+${noPlus}`;
    };

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
      created: []
    };

    // Get all existing phone numbers for this tenant to check duplicates
    const existingCustomers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      select: { phoneNumber: true, email: true }
    });

    const existingPhones = new Set();
    const existingEmails = new Set();
    existingCustomers.forEach(c => {
      if (c.phoneNumber) {
        normalizePhoneVariants(c.phoneNumber).forEach(v => existingPhones.add(v));
      }
      if (c.email) existingEmails.add(c.email.toLowerCase());
    });

    // Track phones added in this batch to prevent duplicates within the import
    const batchPhones = new Set();

    // Validate and prepare customers for import
    const validCustomers = [];
    
    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.phoneNumber || !row.firstName) {
        results.errors.push({ row: rowNum, error: 'Phone number and first name are required' });
        results.skipped++;
        continue;
      }

      // Validate phone number format (basic validation)
      const phoneDigits = row.phoneNumber.replace(/[\s\-\+]/g, '');
      if (!/^\d{7,15}$/.test(phoneDigits)) {
        results.errors.push({ row: rowNum, error: 'Invalid phone number format' });
        results.skipped++;
        continue;
      }

      // Check for duplicate phone in existing customers
      const phoneVariants = normalizePhoneVariants(row.phoneNumber);
      if (phoneVariants.some(v => existingPhones.has(v))) {
        results.errors.push({ row: rowNum, error: 'Customer with this phone already exists' });
        results.skipped++;
        continue;
      }

      // Check for duplicate phone in current batch
      if (phoneVariants.some(v => batchPhones.has(v))) {
        results.errors.push({ row: rowNum, error: 'Duplicate phone number in import file' });
        results.skipped++;
        continue;
      }

      // Check for duplicate email
      if (row.email) {
        const emailLower = row.email.toLowerCase();
        if (existingEmails.has(emailLower)) {
          results.errors.push({ row: rowNum, error: 'Customer with this email already exists' });
          results.skipped++;
          continue;
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          results.errors.push({ row: rowNum, error: 'Invalid email format' });
          results.skipped++;
          continue;
        }
      }

      // Mark phone as used in this batch
      phoneVariants.forEach(v => batchPhones.add(v));
      
      validCustomers.push({
        tenantId,
        phoneNumber: ensurePlus(row.phoneNumber),
        firstName: row.firstName.trim(),
        lastName: row.lastName?.trim() || null,
        email: row.email?.trim() || null,
        whatsappName: row.whatsappName?.trim() || null,
        optedIn: row.optedIn !== false, // Default to opted in
        source: 'bulk_import',
        metadata: { importedAt: new Date().toISOString(), rowNumber: rowNum }
      });
    }

    // Batch insert valid customers
    if (validCustomers.length > 0) {
      // Use createMany for efficiency
      const createResult = await prisma.customer.createMany({
        data: validCustomers,
        skipDuplicates: true
      });

      results.imported = createResult.count;

      // Fetch created customers to return IDs
      const createdCustomers = await prisma.customer.findMany({
        where: {
          tenantId,
          phoneNumber: { in: validCustomers.map(c => c.phoneNumber) }
        },
        select: { id: true, phoneNumber: true, firstName: true }
      });

      results.created = createdCustomers;

      // Create points balances for new customers
      if (createdCustomers.length > 0) {
        await prisma.customerPointsBalance.createMany({
          data: createdCustomers.map(c => ({
            tenantId,
            customerId: c.id,
            currentBalance: 0,
            totalPointsEarned: 0,
            totalPointsRedeemed: 0
          })),
          skipDuplicates: true
        });
      }
    }

    logger.info('Bulk import completed', {
      tenantId,
      userId: req.user.id,
      imported: results.imported,
      skipped: results.skipped,
      errorCount: results.errors.length
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${results.imported} customers`,
      results: {
        imported: results.imported,
        skipped: results.skipped,
        total: customers.length,
        errors: results.errors.slice(0, 20) // Limit errors in response
      }
    });
  } catch (error) {
    logger.error('Bulk import error', { error: error.message, tenantId: req.user?.tenantId });
    res.status(500).json({ error: 'Failed to import customers' });
  }
};
