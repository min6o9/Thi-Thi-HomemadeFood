/**
 * Order details page with payment upload functionality.
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  CreditCard,
  Package,
  Upload,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { config } from '../lib/config';
import { useApiError } from '../hooks/useApiError';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { ContactStrip } from '../components/ContactStrip';
import type { OrderStatus } from '../types';

function getStatusConfig(status: OrderStatus) {
  switch (status) {
    case 'RECEIVED':
      return { label: 'Received', variant: 'info' as const, step: 1 };
    case 'PREPARING':
      return { label: 'Preparing', variant: 'warning' as const, step: 2 };
    case 'DELIVERED':
      return { label: 'Delivered', variant: 'success' as const, step: 3 };
    default:
      return { label: status, variant: 'neutral' as const, step: 0 };
  }
}

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const { getErrorMessage } = useApiError();
  const { settings: bizSettings } = useBusinessSettings();

  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [txLast6, setTxLast6] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Fetch order
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => api.getOrder(orderId!),
    enabled: !!orderId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Upload payment proof mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, txLast6 }: { file: File; txLast6: string }) =>
      api.uploadPaymentProof(orderId!, file, txLast6),
    onSuccess: () => {
      console.log('Payment proof uploaded successfully');
      setShowToast(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId!) });
      setPaymentFile(null);
      setTxLast6('');
      setUploadError('');
    },
    onError: (error) => {
      console.error('Payment upload error:', error);
      setUploadError(getErrorMessage(error));
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!(config.allowedImageTypes as readonly string[]).includes(file.type)) {
      setUploadError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    if (file.size > config.maxFileSize) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setPaymentFile(file);
    setUploadError('');
  };

  const handleUploadPayment = () => {
    if (!paymentFile) {
      setUploadError('Please select a payment proof image');
      return;
    }

    if (!/^\d{6}$/.test(txLast6)) {
      setUploadError('Transaction ID must be exactly 6 digits');
      return;
    }

    uploadMutation.mutate({ file: paymentFile, txLast6 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-burmese-ruby" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Order not found
            </h2>
            <p className="text-gray-600 mb-6">
              This order may not exist or you don't have permission to view it.
            </p>
            <Link to="/orders">
              <Button variant="primary">View My Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const order = data;
  const statusConfig = getStatusConfig(order.status);
  const paymentRejected = order.payment.rejected && !order.payment.verified;
  const needsPayment = !order.payment.verified && (!order.payment.proofUrl || paymentRejected);
  const paymentPending = order.payment.proofUrl && !order.payment.verified && !paymentRejected;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-container mx-auto px-4">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-burmese-ruby mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to orders
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Delivery အသေးစိတ်</h1>
              <p className="text-gray-600 mt-1">
                Order #{order._id.slice(-8).toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              {order.payment.verified && (
                <Badge variant="success">Paid</Badge>
              )}
              {paymentRejected && (
                <Badge variant="error">Payment Rejected</Badge>
              )}
              {paymentPending && (
                <Badge variant="warning">Verifying Payment</Badge>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-burmese-ruby" />
                ၀ယ်ယူထားသော ဟင်းပွဲ
              </h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between pb-4 border-b border-gray-200 last:border-0"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.qty} x {item.price.toLocaleString()} Ks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {(item.price * item.qty).toLocaleString()} Ks
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-burmese-ruby">
                  {order.totals.total.toLocaleString()} Ks
                </span>
              </div>
            </Card>

            {/* Payment Upload */}
            {needsPayment && (
              <Card className="bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  Complete Payment
                </h3>

                {paymentRejected && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Payment Rejected</p>
                      <p className="text-sm text-red-600 mt-0.5">Your payment screenshot was rejected. Please make a new transfer and upload a fresh screenshot below.</p>
                    </div>
                  </div>
                )}

                <div className="bg-white p-4 rounded-md mb-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Please pay <strong>{order.totals.total.toLocaleString()} Ks</strong> to the following account:
                    </p>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Bank:</span>
                      <span className="text-gray-900 font-semibold">{bizSettings.bankName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">KBZPay Number:</span>
                      <span className="text-gray-900 font-semibold">{bizSettings.kbzPayNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Account Name:</span>
                      <span className="text-gray-900 font-semibold">{bizSettings.kbzPayName}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-500">
                      Reference: Order #{order._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{uploadError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Screenshot
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-burmese-ruby file:text-white hover:file:bg-red-700"
                    />
                    {paymentFile && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {paymentFile.name}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Last 6 digits of Transaction ID"
                    value={txLast6}
                    onChange={(e) => setTxLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                  />

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleUploadPayment}
                    loading={uploadMutation.isPending}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Upload Payment Proof
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Delivery Information */}
            <Card>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-burmese-ruby" />
                Delivery Information
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">အိမ်လိပ်စာ</p>
                  <p className="text-gray-900 font-medium">
                    {order.contactInfo.address}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Contact Phone
                  </p>
                  <p className="text-gray-900 font-medium">
                    {order.contactInfo.phone}
                  </p>
                </div>
                {order.notes && (
                  <div>
                    <p className="text-gray-500 mb-1">Order Notes</p>
                    <p className="text-gray-900">{order.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Contact Section */}
            <ContactStrip variant="compact" />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="Payment uploaded successfully!"
          type="success"
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
