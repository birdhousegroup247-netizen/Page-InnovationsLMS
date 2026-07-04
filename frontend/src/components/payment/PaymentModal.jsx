import { useState } from 'react';
import { X, CreditCard, Lock, Check, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import { formatPrice } from '../../utils/currency';

export default function PaymentModal({ isOpen, onClose, course, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
  });

  if (!isOpen) return null;

  const isFree = !course.price || course.price === 0;
  const price = course.price || 0;
  const discount = course.discount_percentage || 0;
  const discountedPrice = price - (price * discount / 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For free courses, enroll directly
      if (isFree) {
        await onSuccess();
        return;
      }

      // TODO: Integrate with Stripe API
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success
      await onSuccess();
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    if (value.length <= 19) {
      setFormData({ ...formData, cardNumber: value });
    }
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    if (value.length <= 5) {
      setFormData({ ...formData, expiry: value });
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData({ ...formData, cvv: value });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-dark-800 rounded-2xl shadow-2xl transform transition-all animate-scale-in">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-border-dark">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isFree ? 'Enroll in Course' : 'Complete Your Purchase'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isFree ? 'Confirm your enrollment' : 'Secure payment powered by Stripe'}
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 p-6">
            {/* Payment Form - Left Side */}
            <div className="md:col-span-3">
              <form onSubmit={handleSubmit}>
                {!isFree && (
                  <>
                    {/* Payment Method Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={cn(
                            'flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                            paymentMethod === 'card'
                              ? 'border-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10'
                              : 'border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-dark-600'
                          )}
                        >
                          <CreditCard className="w-5 h-5" />
                          <span className="font-medium">Card</span>
                          {paymentMethod === 'card' && (
                            <Check className="w-4 h-4 text-brand-blue ml-auto" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('paypal')}
                          disabled
                          className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-border-dark opacity-50 cursor-not-allowed"
                        >
                          <span className="font-medium">PayPal</span>
                          <span className="text-xs text-gray-500">(Soon)</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Details */}
                    {paymentMethod === 'card' && (
                      <div className="space-y-4">
                        {/* Card Number */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Card Number
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="1234 5678 9012 3456"
                              value={formData.cardNumber}
                              onChange={handleCardNumberChange}
                              required
                              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                            />
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          </div>
                        </div>

                        {/* Cardholder Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.cardName}
                            onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                          />
                        </div>

                        {/* Expiry & CVV */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={formData.expiry}
                              onChange={handleExpiryChange}
                              required
                              className="w-full px-4 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              CVV
                            </label>
                            <input
                              type="text"
                              placeholder="123"
                              value={formData.cvv}
                              onChange={handleCvvChange}
                              required
                              className="w-full px-4 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Security Badge */}
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Lock className="w-4 h-4 text-green-500" />
                      <span>Your payment information is secure and encrypted</span>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isFree ? 'Enroll For Free' : `Pay ${formatPrice(discountedPrice)}`}
                    </>
                  )}
                </button>

                {/* Terms */}
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  By completing this purchase, you agree to our{' '}
                  <a href="/terms" className="text-brand-blue hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-brand-blue hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </form>
            </div>

            {/* Order Summary - Right Side */}
            <div className="md:col-span-2">
              <div className="sticky top-6 bg-gray-50 dark:bg-dark-700 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Order Summary
                </h3>

                {/* Course Info */}
                <div className="flex gap-3">
                  <img
                    src={course.thumbnail_url || `https://placehold.co/100x60/0e2b5c/ffffff?text=Course`}
                    alt={course.title}
                    className="w-20 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      by {course.instructor?.full_name || 'Page Innovations'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-border-dark pt-4 space-y-3">
                  {/* Price Breakdown */}
                  {!isFree && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Original Price</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatPrice(price)}
                        </span>
                      </div>

                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Discount ({discount}%)
                          </span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            -{formatPrice((price * discount) / 100)}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-gray-200 dark:border-border-dark pt-3 flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="font-bold text-xl text-brand-blue">
                          {formatPrice(discountedPrice)}
                        </span>
                      </div>
                    </>
                  )}

                  {isFree && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Price</span>
                      <span className="font-bold text-xl text-green-600 dark:text-green-400">
                        FREE
                      </span>
                    </div>
                  )}
                </div>

                {/* What's Included */}
                <div className="border-t border-gray-200 dark:border-border-dark pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    What's Included:
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Lifetime access
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Certificate of completion
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      30-day money-back guarantee
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Downloadable resources
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
