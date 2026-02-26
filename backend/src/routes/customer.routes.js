import express from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  adjustPoints,
  blockCustomer,
  bulkImportCustomers
} from '../controllers/customer.controller.js';
import { authenticate, setTenantContext, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(setTenantContext);

router.get('/search', listCustomers); // Use listCustomers with query param
router.get('/', listCustomers);
router.get('/:id', getCustomer);
// Admin-only mutations to protect data integrity
router.post('/', adminOnly, createCustomer);
router.post('/bulk-import', adminOnly, bulkImportCustomers);
router.put('/:id', adminOnly, updateCustomer);
router.delete('/:id', adminOnly, deleteCustomer);
router.post('/:id/adjust-points', adminOnly, adjustPoints);
router.post('/:id/block', adminOnly, blockCustomer);

export default router;
