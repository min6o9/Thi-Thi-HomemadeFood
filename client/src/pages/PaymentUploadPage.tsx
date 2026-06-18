import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { ContactStrip } from '../components/ContactStrip';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export function PaymentUploadPage() {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { setPayment } = useCheckout();

  const [file, setFile] = useState<File | null>(null);
  const [txLast6, setTxLast6] = useState('');
  const [fileError, setFileError] = useState('');
  const [txError, setTxError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cart.items.length === 0) navigate('/');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (selected: File) => {
    setFileError('');
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      setFileError('Please upload a JPEG, PNG, GIF, or WebP image');
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleContinue = () => {
    let valid = true;
    if (!file) {
      setFileError('Please upload your payment screenshot');
      valid = false;
    } else if (file.size > 5 * 1024 * 1024) {
      setFileError('File must be under 5MB');
      valid = false;
    }
    if (txLast6.length > 0 && txLast6.length !== 6) {
      setTxError('Please enter exactly 6 digits');
      valid = false;
    }
    if (!valid) return;

    setPayment(file!, txLast6);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back link */}
        <Link
          to="/order-review"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-burmese-ruby mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payment Info
        </Link>

        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Upload Payment Screenshot
            </h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              Step 2 of 3
            </span>
          </div>
        </div>

        <ContactStrip variant="compact" className="mb-6" />

        <Card>
          {/* File upload section */}
          <h2 className="text-lg font-semibold mb-4">Payment Screenshot</h2>

          {/* Drop zone — no file */}
          {!file && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-2 border-burmese-ruby bg-red-50'
                    : 'border-2 border-dashed border-gray-300 hover:border-burmese-ruby hover:bg-red-50'
                }`}
              >
                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">
                  KBZpay receipt ပိုရန်
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  JPEG, PNG, WebP &middot; Max 5MB
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                ref={fileInputRef}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelect(selected);
                }}
              />
            </>
          )}

          {/* File selected state */}
          {file && (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4">
              <img
                src={URL.createObjectURL(file)}
                alt="Payment screenshot preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* File error */}
          {fileError && (
            <p className="text-sm text-red-600 mt-2">{fileError}</p>
          )}

          {/* Transaction ID */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction ID နောက်ဆုံး ၆ လုံးရိုက်ထည့်ပေးပါရန် ( optional )
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={txLast6}
              onChange={(e) => {
                setTxLast6(e.target.value.replace(/\D/g, ''));
                setTxError('');
              }}
              placeholder="e.g. 123456"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-burmese-ruby focus:border-transparent"
            />
            {txError && (
              <p className="text-sm text-red-600 mt-1">{txError}</p>
            )}
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleContinue}
            >
              Continue to Delivery &rarr;
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
