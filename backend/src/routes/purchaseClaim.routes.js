import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { submitClaim, listClaims, reviewClaim } from '../controllers/purchaseClaim.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyFlowSignature } from '../middleware/flowSignature.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const isDev = process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
	if (isDev) console.log(...args);
};

// Health check (no signature required)
router.get('/health', (req, res) => {
	res.json({ status: 'ok', service: 'claims', timestamp: new Date().toISOString() });
});

// WhatsApp Flows health check - receives encrypted request, returns encrypted response
router.post('/health', (req, res) => {
	const { encrypted_aes_key, encrypted_flow_data, initial_vector } = req.body;
	
	if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
		// Not an encrypted health request, return plain status
		return res.json({ version: '3.0', data: { status: 'active' } });
	}

	try {
		// Load private key
		const privateKeyPath = path.join(__dirname, '../../flow_private_key.pem');
		const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
		const privateKey = crypto.createPrivateKey(privateKeyPem);

		// Decrypt AES key
		const decryptedAesKey = crypto.privateDecrypt(
			{
				key: privateKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
				oaepHash: 'sha256',
			},
			Buffer.from(encrypted_aes_key, 'base64')
		);

		// Decrypt Flow data
		const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
		const initialVectorBuffer = Buffer.from(initial_vector, 'base64');
		const TAG_LENGTH = 16;
		const encryptedFlowDataBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
		const encryptedFlowDataTag = flowDataBuffer.subarray(-TAG_LENGTH);

		const decipher = crypto.createDecipheriv(
			'aes-128-gcm',
			decryptedAesKey,
			initialVectorBuffer
		);
		decipher.setAuthTag(encryptedFlowDataTag);

		const decryptedData = Buffer.concat([
			decipher.update(encryptedFlowDataBody),
			decipher.final(),
		]).toString('utf-8');

		JSON.parse(decryptedData);
		debugLog('✅ Flow health check request decrypted');

		// Prepare response
		const responsePayload = { data: { status: 'active' } };

		// Flip the initialization vector
		const flippedIV = Buffer.from(initialVectorBuffer).map(byte => ~byte);

		// Encrypt response
		const cipher = crypto.createCipheriv('aes-128-gcm', decryptedAesKey, flippedIV);
		const encryptedResponse = Buffer.concat([
			cipher.update(JSON.stringify(responsePayload), 'utf-8'),
			cipher.final(),
			cipher.getAuthTag(),
		]).toString('base64');

		debugLog('✅ Flow health check response encrypted');
		return res.type('text/plain').send(encryptedResponse);
	} catch (error) {
		console.error('❌ Health check encryption/decryption failed:', error);
		return res.status(500).json({ error: 'Health check failed' });
	}
});

// Public endpoint - customer submits claim via WhatsApp Flow
// Handles encrypted Flow submissions
router.post('/submit', async (req, res) => {
	debugLog('📨 POST /api/v1/claims/submit');
	
	const { encrypted_aes_key, encrypted_flow_data, initial_vector } = req.body;
	
	// Check if this is an encrypted Flow request
	if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
		debugLog('📨 Direct (non-encrypted) claim submission');
		// Not encrypted, pass to controller as-is (direct API call)
		return submitClaim(req, res);
	}
	
	debugLog('📨 Encrypted Flow submission detected');

	try {
		// Load private key
		const privateKeyPath = path.join(__dirname, '../../flow_private_key.pem');
		const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
		const privateKey = crypto.createPrivateKey(privateKeyPem);

		// Decrypt AES key
		const decryptedAesKey = crypto.privateDecrypt(
			{
				key: privateKey,
				padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
				oaepHash: 'sha256',
			},
			Buffer.from(encrypted_aes_key, 'base64')
		);

		// Decrypt Flow data
		const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
		const initialVectorBuffer = Buffer.from(initial_vector, 'base64');
		const TAG_LENGTH = 16;
		const encryptedFlowDataBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
		const encryptedFlowDataTag = flowDataBuffer.subarray(-TAG_LENGTH);

		const decipher = crypto.createDecipheriv(
			'aes-128-gcm',
			decryptedAesKey,
			initialVectorBuffer
		);
		decipher.setAuthTag(encryptedFlowDataTag);

		const decryptedData = Buffer.concat([
			decipher.update(encryptedFlowDataBody),
			decipher.final(),
		]).toString('utf-8');

		const decryptedRequest = JSON.parse(decryptedData);
		debugLog('✅ Flow submission decrypted');

		// Replace req.body with decrypted data for controller
		req.body = decryptedRequest;
		
		// Call the controller and capture response
		const controllerResponse = await new Promise((resolve, reject) => {
			const mockRes = {
				statusCode: 200,
				headersSent: false,
				status: function(code) {
					this.statusCode = code;
					return this;
				},
				json: function(data) {
					this.headersSent = true;
					resolve({ status: this.statusCode, data });
					return this;
				}
			};
			
			// Handle controller errors
			submitClaim(req, mockRes).catch(reject);
		});

		debugLog(`✅ Claims controller responded with status ${controllerResponse.status}`);

		// Prepare response payload based on status
		const responsePayload = {
			version: '3.0',
			screen: controllerResponse.status >= 200 && controllerResponse.status < 300 ? 'SUCCESS' : 'ERROR',
			data: controllerResponse.data
		};

		// Flip the initialization vector
		const flippedIV = Buffer.from(initialVectorBuffer).map(byte => ~byte);

		// Encrypt response
		const cipher = crypto.createCipheriv('aes-128-gcm', decryptedAesKey, flippedIV);
		const encryptedResponse = Buffer.concat([
			cipher.update(JSON.stringify(responsePayload), 'utf-8'),
			cipher.final(),
			cipher.getAuthTag(),
		]).toString('base64');

		debugLog('✅ Flow submission encrypted response ready');
		return res.type('text/plain').send(encryptedResponse);
	} catch (error) {
		console.error('❌ Flow submission encryption/decryption failed:', error);
		
		// Try to return encrypted error response
		try {
			const errorPayload = {
				version: '3.0',
				screen: 'ERROR',
				data: { error: 'Submission failed' }
			};
			
			const privateKeyPath = path.join(__dirname, '../../flow_private_key.pem');
			const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
			const privateKey = crypto.createPrivateKey(privateKeyPem);
			
			const decryptedAesKey = crypto.privateDecrypt(
				{
					key: privateKey,
					padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
					oaepHash: 'sha256',
				},
				Buffer.from(encrypted_aes_key, 'base64')
			);
			
			const initialVectorBuffer = Buffer.from(initial_vector, 'base64');
			const flippedIV = Buffer.from(initialVectorBuffer).map(byte => ~byte);
			
			const cipher = crypto.createCipheriv('aes-128-gcm', decryptedAesKey, flippedIV);
			const encryptedResponse = Buffer.concat([
				cipher.update(JSON.stringify(errorPayload), 'utf-8'),
				cipher.final(),
				cipher.getAuthTag(),
			]).toString('base64');
			
			return res.type('text/plain').send(encryptedResponse);
		} catch (encryptError) {
			return res.status(500).json({ error: 'Submission failed' });
		}
	}
});

// Protected endpoints - vendor dashboard
router.get('/', authenticate, listClaims);
router.post('/:id/review', authenticate, reviewClaim);

export default router;
