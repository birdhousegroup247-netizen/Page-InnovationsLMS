import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { coursesAPI, paymentsAPI, couponsAPI } from '../lib/api';
import { CheckCircle, Tag, Info, ArrowLeft, Lock, CreditCard, Calendar } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState('full');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId) {
      navigate('/courses');
      return;
    }
    coursesAPI
      .getById(courseId)
      .then((res) => setCourse(res.data.data.course))
      .catch(() => setError('Course not found'))
      .finally(() => setPageLoading(false));
  }, [courseId, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);
    try {
      const res = await couponsAPI.validate({
        code: couponCode.trim().toUpperCase(),
        course_id: courseId,
        amount: course.price,
      });
      setAppliedCoupon(res.data.data);
    } catch (e) {
      setCouponError(e.response?.data?.message || 'Invalid or expired coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.createCheckoutSession({
        course_id: courseId,
        payment_plan: paymentPlan,
        coupon_code: appliedCoupon ? couponCode.trim().toUpperCase() : undefined,
      });
      // Redirect to Stripe hosted checkout
      window.location.href = res.data.data.checkout_url;
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const basePrice = parseFloat(course?.price || 0);
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const priceAfterCoupon = Math.max(0, basePrice - discountAmount);
  const dueNow =
    paymentPlan === 'installment'
      ? parseFloat((priceAfterCoupon * 0.6).toFixed(2))
      : priceAfterCoupon;
  const dueLater =
    paymentPlan === 'installment'
      ? parseFloat((priceAfterCoupon * 0.4).toFixed(2))
      : 0;

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
      </div>
    );
  }

  if (!course && error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link to="/courses" className="text-brand-blue hover:underline">
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-border-dark px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <img src={logo} alt="TekyPro" className="h-8 w-auto" />
          <div className="flex items-center gap-1 ml-auto text-xs text-gray-500 dark:text-gray-400">
            <Lock className="w-3 h-3" />
            Secure Checkout
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Course Info */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Complete Your Enrollment
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              You're one step away from starting your learning journey
            </p>
          </div>

          {/* Course Card */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <div className="flex gap-4">
              {course?.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">
                  {course?.title}
                </h2>
                {course?.instructor && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    by {course.instructor.full_name}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {course?.difficulty && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full capitalize">
                      {course.difficulty}
                    </span>
                  )}
                  {course?.duration_hours && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {course.duration_hours}h of content
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">What you get</h3>
            <div className="space-y-3">
              {[
                'Full lifetime access to all course content',
                'Certificate of completion',
                'Access to course Q&A and community forum',
                'Live session recordings',
                'Practice tests and assignments',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price Summary */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Course price</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${basePrice.toFixed(2)}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount ({couponCode.toUpperCase()})</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-border-dark pt-2 mt-2 flex justify-between font-semibold text-base">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-brand-blue">${priceAfterCoupon.toFixed(2)}</span>
              </div>
            </div>

            {paymentPlan === 'installment' && priceAfterCoupon > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between text-blue-700 dark:text-blue-300 font-medium">
                  <span>Due now (60%)</span>
                  <span>${dueNow.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>Due in 21 days (40%)</span>
                  <span>${dueLater.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Plan */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Plan
            </h3>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  paymentPlan === 'full'
                    ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="full"
                  checked={paymentPlan === 'full'}
                  onChange={() => setPaymentPlan('full')}
                  className="mt-0.5 text-brand-blue focus:ring-brand-blue"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">Pay in Full</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    One payment, full access immediately
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                  ${priceAfterCoupon.toFixed(2)}
                </span>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  paymentPlan === 'installment'
                    ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value="installment"
                  checked={paymentPlan === 'installment'}
                  onChange={() => setPaymentPlan('installment')}
                  className="mt-0.5 text-brand-blue focus:ring-brand-blue"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    60/40 Installment
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Pay 60% now, 40% in 21 days
                  </div>
                </div>
                <span className="text-sm font-semibold text-brand-blue ml-2 flex-shrink-0">
                  ${dueNow.toFixed(2)}
                </span>
              </label>
            </div>

            {paymentPlan === 'installment' && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Full access immediately. Continued access depends on the 2nd payment being made
                  on time.
                </span>
              </div>
            )}
          </div>

          {/* Coupon Code */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Coupon Code
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-green-700 dark:text-green-400">
                    {couponCode.toUpperCase()}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500">
                    -${discountAmount.toFixed(2)} saved!
                  </div>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="ENTER CODE"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent uppercase tracking-widest"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}

            {couponError && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-2">{couponError}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full py-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-blue/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            {checkoutLoading
              ? 'Redirecting to Secure Payment...'
              : `Pay ${
                  paymentPlan === 'installment'
                    ? `$${dueNow.toFixed(2)} Now`
                    : `$${priceAfterCoupon.toFixed(2)}`
                }`}
          </button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Secured by Stripe. Your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
