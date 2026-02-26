import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';

export default function TestCurrencyPage() {
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendorId') || undefined;
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const url = `/financial/data-exchange${vendorId ? `?vendorId=${vendorId}` : ''}`;
        const res = await apiClient.request(url, { skipAuth: true });
        setPayload(res.data_exchange || res.data?.data_exchange || res);
      } catch (err) {
        console.error('Failed to fetch data_exchange:', err);
      }
    }
    load();
  }, [vendorId]);

  if (!payload) return <div className="p-6">Loading...</div>;

  const exampleAmount = 1234.5;
  const formatted = `${payload.currency_symbol}${Number(exampleAmount).toLocaleString(undefined, { minimumFractionDigits: payload.decimal_precision, maximumFractionDigits: payload.decimal_precision })}`;

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-2">Currency Test</h2>
      <p className="text-sm text-gray-600 mb-4">VendorId: {vendorId || 'none'}</p>

      <div className="bg-white border rounded p-4">
        <p><strong>Currency Code:</strong> {payload.currency_code}</p>
        <p><strong>Currency Symbol:</strong> <span data-testid="currency-symbol">{payload.currency_symbol}</span></p>
        <p><strong>Decimal Precision:</strong> {payload.decimal_precision}</p>
        <p className="mt-3"><strong>Example:</strong> <span data-testid="formatted-amount">{formatted}</span></p>
      </div>
    </div>
  );
}
