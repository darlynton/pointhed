import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the private key
const privateKeyPath = path.join(__dirname, '../../flow_private_key.pem');
let privateKey;

try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (error) {
  console.error('⚠️  Flow private key not found. Flow signature verification disabled.');
}

/**
 * Middleware to verify WhatsApp Flow request signatures
 * This ensures requests actually come from Meta and haven't been tampered with
 */
export const verifyFlowSignature = (req, res, next) => {
  // Skip verification if private key is not loaded (development mode)
  if (!privateKey) {
    console.warn('⚠️  Flow signature verification skipped - no private key');
    return next();
  }

  const signature = req.headers['x-whatsapp-signature'];
  
  if (!signature) {
    console.error('❌ Missing x-whatsapp-signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  try {
    // WhatsApp sends the request body as the signed data
    const body = JSON.stringify(req.body);
    
    // Verify the signature using the public key
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(body);
    
    // Extract public key from private key for verification
    const publicKey = crypto.createPublicKey(privateKey);
    const isValid = verifier.verify(publicKey, signature, 'base64');
    
    if (!isValid) {
      console.error('❌ Invalid Flow signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log('✅ Flow signature verified');
    next();
  } catch (error) {
    console.error('❌ Flow signature verification error:', error);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

/**
 * Generate a response signature for Flow responses
 * This proves to WhatsApp that the response came from our server
 */
export const signFlowResponse = (responseData) => {
  if (!privateKey) {
    console.warn('⚠️  Response signing skipped - no private key');
    return null;
  }

  try {
    const dataString = JSON.stringify(responseData);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(dataString);
    const signature = sign.sign(privateKey, 'base64');
    return signature;
  } catch (error) {
    console.error('❌ Error signing Flow response:', error);
    return null;
  }
};
