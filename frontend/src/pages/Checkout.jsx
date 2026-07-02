import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api, { coursesAPI, paymentsAPI, couponsAPI } from '../lib/api';
import { CheckCircle, Tag, Info, Lock, CreditCard, Calendar, AlertTriangle, Package } from 'lucide-react';
import StandaloneHeader from '../components/layout/StandaloneHeader';
import { formatPrice } from '../utils/currency';

// Load Paystack Inline.js from CDN
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

// Load PayPal JS SDK from CDN. Sandbox vs live is implied by the client-id.
function loadPayPalScript(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return; }
    if (!clientId) { reject(new Error('PayPal client ID not configured')); return; }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const bundleId = searchParams.get('bundle_id');
  const isBundle = !!bundleId;
  const isInstallmentPayment = searchParams.get('installment_payment') === '1';
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState('full');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [error, setError] = useState('');

  // For installment second payment mode
  const [installmentPayment, setInstallmentPayment] = useState(null);

  // PayPal SDK callbacks are created once, but read fresh state via refs so coupon/plan
  // changes after the SDK loads still flow into createOrder.
  const paymentPlanRef = useRef(paymentPlan);
  const couponCodeRef = useRef(couponCode);
  const appliedCouponRef = useRef(appliedCoupon);
  useEffect(() => { paymentPlanRef.current = paymentPlan; }, [paymentPlan]);
  useEffect(() => { couponCodeRef.current = couponCode; }, [couponCode]);
  useEffect(() => { appliedCouponRef.current = appliedCoupon; }, [appliedCoupon]);

  const paypalButtonsRef = useRef(null);
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  // Load PayPal SDK once on mount (only if configured)
  useEffect(() => {
    if (!paypalClientId) return;
    setPaypalLoading(true);
    loadPayPalScript(paypalClientId)
      .then(() => setPaypalReady(true))
      .catch(() => {
        // Silent: PayPal is one of three options, no need to break the page if it fails
      })
      .finally(() => setPaypalLoading(false));
  }, [paypalClientId]);

  // Render PayPal Buttons widget when the SDK is loaded and the container is mounted.
  // Identity changes only when paypalReady toggles, so React re-attaches (and we render)
  // once after the SDK has loaded. It does NOT re-render on coupon/plan changes — those
  // are picked up via refs inside createOrder.
  const paypalRefCb = useCallback((containerEl) => {
    if (!containerEl || !paypalReady || !window.paypal) return;
    if (paypalButtonsRef.current) {
      try { paypalButtonsRef.current.close(); } catch (_) { /* ignore */ }
      paypalButtonsRef.current = null;
    }
    containerEl.innerHTML = '';

    const buttons = window.paypal.Buttons({
      style: { layout: 'horizontal', height: 45, label: 'pay', tagline: false, shape: 'rect' },
      createOrder: async () => {
        try {
          setError('');
          if (isInstallmentPayment) {
            const r = await paymentsAPI.initializePayPalInstallment();
            return r.data.data.order_id;
          }
          const r = await paymentsAPI.initializePayPalCheckout({
            ...(isBundle ? { bundle_id: bundleId } : { course_id: courseId }),
            payment_plan: paymentPlanRef.current,
            coupon_code: appliedCouponRef.current
              ? couponCodeRef.current.trim().toUpperCase()
              : undefined,
          });
          return r.data.data.order_id;
        } catch (e) {
          setError(e.response?.data?.message || 'Failed to start PayPal checkout.');
          throw e;
        }
      },
      onApprove: async (data) => {
        try {
          await paymentsAPI.capturePayPalOrder(data.orderID);
          navigate(`/payment-success?order_id=${data.orderID}&gateway=paypal`);
        } catch (e) {
          setError(
            e.response?.data?.message ||
              'PayPal capture failed. If you were charged, check My Courses or contact support.'
          );
        }
      },
      onCancel: () => setError('PayPal payment was cancelled.'),
      onError: () => setError('PayPal payment failed. Please try again or use another method.'),
    });
    buttons.render(containerEl).catch(() => {});
    paypalButtonsRef.current = buttons;
  }, [paypalReady, courseId, bundleId, isBundle, isInstallmentPayment, navigate]);

  useEffect(() => () => {
    if (paypalButtonsRef.current) {
      try { paypalButtonsRef.current.close(); } catch (_) { /* ignore */ }
      paypalButtonsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isInstallmentPayment) {
      // Load outstanding installment balance
      paymentsAPI
        .getMyPayments()
        .then((res) => {
          const payments = res.data?.data?.payments || [];
          const overdue = payments.find(
            (p) =>
              p.payment_plan === 'installment' &&
              p.payment_status === 'completed' &&
              ['pending', 'overdue'].includes(p.installment_status)
          );
          if (!overdue) {
            navigate('/billing');
            return;
          }
          setInstallmentPayment(overdue);
          setCourse(overdue.course || null);
        })
        .catch(() => setError('Unable to load installment details'))
        .finally(() => setPageLoading(false));
      return;
    }

    if (isBundle) {
      api
        .get(`/api/bundles/${bundleId}`)
        .then((res) => {
          const b = res.data.data.bundle;
          setBundle(b);
          // Present the bundle as the "course" so the summary UI still lights up
          setCourse({
            id: b.id,
            title: b.title,
            price: b.price,
            thumbnail: b.thumbnail_url,
          });
        })
        .catch(() => setError('Bundle not found'))
        .finally(() => setPageLoading(false));
      return;
    }

    if (!courseId) {
      navigate('/courses');
      return;
    }
    coursesAPI
      .getById(courseId)
      .then((res) => setCourse(res.data.data.course))
      .catch(() => setError('Course not found'))
      .finally(() => setPageLoading(false));
  }, [courseId, bundleId, isBundle, isInstallmentPayment, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);
    try {
      // For bundles, validate against the anchor course (first course in the
      // bundle) — backend also accepts any-course-in-bundle for coupon eligibility.
      const anchorCourseId = isBundle && bundle?.courses?.length ? bundle.courses[0].id : courseId;
      const res = await couponsAPI.validate({
        code: couponCode.trim().toUpperCase(),
        course_id: anchorCourseId,
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

  const handleInstallmentCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.createInstallmentSession();
      window.location.href = res.data.data.checkout_url;
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start payment. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handlePaystackInstallmentCheckout = async () => {
    setPaystackLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.initializePaystackInstallment();
      const { reference, amount, email } = res.data.data;
      await loadPaystackScript();
      setPaystackLoading(false);
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.round(amount * 100),
        currency: import.meta.env.VITE_PAYMENT_CURRENCY || 'USD',
        ref: reference,
        onClose: () => setError('Payment was cancelled.'),
        callback: (response) => {
          navigate(`/payment-success?reference=${response.reference}&gateway=paystack`);
        },
      });
      handler.openIframe();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start payment. Please try again.');
      setPaystackLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.createCheckoutSession({
        ...(isBundle ? { bundle_id: bundleId } : { course_id: courseId }),
        payment_plan: paymentPlan,
        coupon_code: appliedCoupon ? couponCode.trim().toUpperCase() : undefined,
      });
      window.location.href = res.data.data.checkout_url;
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handlePaystackCheckout = async () => {
    setPaystackLoading(true);
    setError('');
    try {
      const res = await paymentsAPI.initializePaystackCheckout({
        ...(isBundle ? { bundle_id: bundleId } : { course_id: courseId }),
        payment_plan: paymentPlan,
        coupon_code: appliedCoupon ? couponCode.trim().toUpperCase() : undefined,
      });
      const { reference, amount, email } = res.data.data;
      await loadPaystackScript();
      setPaystackLoading(false);
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.round(amount * 100),
        currency: import.meta.env.VITE_PAYMENT_CURRENCY || 'USD',
        ref: reference,
        onClose: () => setError('Payment was cancelled.'),
        callback: (response) => {
          navigate(`/payment-success?reference=${response.reference}&gateway=paystack`);
        },
      });
      handler.openIframe();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start payment. Please try again.');
      setPaystackLoading(false);
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

  // ── Installment second payment mode ─────────────────────────────────────────
  if (isInstallmentPayment && installmentPayment) {
    const remaining = parseFloat(installmentPayment.installment_remaining_amount || 0);
    const isOverdue = installmentPayment.installment_status === 'overdue';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <StandaloneHeader
          backTo="/billing"
          title="Complete your payment"
          subtitle={installmentPayment.course?.title || 'Remaining balance'}
          right={
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Lock className="w-3 h-3" />
              Secure Checkout
            </div>
          }
        />

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {isOverdue && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Installment Overdue</p>
                <p className="text-red-600 dark:text-red-500 text-xs mt-0.5">
                  Your installment payment is past due. Pay now to restore or maintain full course access.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Pay Remaining Balance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Complete your installment payment to maintain full course access.
            </p>

            {course && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg mb-6">
                {course.thumbnail && (
                  <img src={course.thumbnail} alt={course.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{course.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Installment balance</p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm border-t border-gray-100 dark:border-dark-700 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Original price</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(installmentPayment.original_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Already paid (60%)</span>
                <span className="text-gray-900 dark:text-white">{formatPrice(installmentPayment.amount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 dark:border-dark-700 pt-2">
                <span className="text-gray-900 dark:text-white">Remaining balance</span>
                <span className="text-brand-blue">{formatPrice(remaining)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Show only the gateway used for the first payment */}
            {installmentPayment?.payment_gateway === 'paystack' && (
              <button
                onClick={handlePaystackInstallmentCheckout}
                disabled={paystackLoading}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-5 h-5" />
                {paystackLoading ? 'Loading...' : `Pay ${formatPrice(remaining)} Now`}
              </button>
            )}
            {installmentPayment?.payment_gateway === 'paypal' && (
              <div className="space-y-2">
                <div
                  ref={paypalRefCb}
                  className="min-h-[48px]"
                />
                {paypalLoading && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Loading PayPal...
                  </p>
                )}
                {!paypalClientId && (
                  <p className="text-xs text-center text-red-500 dark:text-red-400">
                    PayPal is not configured. Contact support.
                  </p>
                )}
              </div>
            )}
            {installmentPayment?.payment_gateway !== 'paystack' &&
              installmentPayment?.payment_gateway !== 'paypal' && (
                <button
                  onClick={handleInstallmentCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-blue/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-5 h-5" />
                  {checkoutLoading ? 'Redirecting to Secure Payment...' : `Pay ${formatPrice(remaining)} Now`}
                </button>
              )}

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-3">
              <Lock className="w-3 h-3" />
              Your payment info is never stored on our servers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── New enrollment checkout ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <StandaloneHeader
        title="Checkout"
        subtitle={bundle ? bundle.title : course?.title}
        right={
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Lock className="w-3 h-3" />
            Secure Checkout
          </div>
        }
      />

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

          {/* Course / Bundle Card */}
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
                {isBundle && (
                  <span className="inline-flex items-center gap-1 text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full mb-1.5">
                    <Package className="w-3 h-3" /> Bundle · {bundle?.courses?.length || 0} courses
                  </span>
                )}
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

            {isBundle && bundle?.courses?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-dark-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Courses included
                </p>
                <ul className="space-y-1.5">
                  {bundle.courses.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                  {formatPrice(basePrice)}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount ({couponCode.toUpperCase()})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-border-dark pt-2 mt-2 flex justify-between font-semibold text-base">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-brand-blue">{formatPrice(priceAfterCoupon)}</span>
              </div>
            </div>

            {paymentPlan === 'installment' && priceAfterCoupon > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between text-blue-700 dark:text-blue-300 font-medium">
                  <span>Due now (60%)</span>
                  <span>{formatPrice(dueNow)}</span>
                </div>
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>Due in 21 days (40%)</span>
                  <span>{formatPrice(dueLater)}</span>
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
                  {formatPrice(priceAfterCoupon)}
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
                  {formatPrice(dueNow)}
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
                    -{formatPrice(discountAmount)} saved!
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

          {/* Payment Gateway Buttons */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">Choose your payment method</p>

            {/* Stripe — International */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || paystackLoading}
              className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-between px-5 shadow-lg shadow-brand-blue/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {checkoutLoading
                  ? 'Redirecting...'
                  : `Pay ${paymentPlan === 'installment' ? `${formatPrice(dueNow)} Now` : `${formatPrice(priceAfterCoupon)}`}`}
              </span>
              <span className="text-xs opacity-75 font-normal">International (Stripe)</span>
            </button>

            {/* Paystack — Nigeria */}
            <button
              onClick={handlePaystackCheckout}
              disabled={checkoutLoading || paystackLoading}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-between px-5 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {paystackLoading
                  ? 'Loading...'
                  : `Pay ${paymentPlan === 'installment' ? `${formatPrice(dueNow)} Now` : `${formatPrice(priceAfterCoupon)}`}`}
              </span>
              <span className="text-xs opacity-75 font-normal">Nigeria (Paystack)</span>
            </button>

            {/* PayPal — only rendered if VITE_PAYPAL_CLIENT_ID is configured */}
            {paypalClientId && (
              <div className="space-y-1.5">
                <div
                  ref={paypalRefCb}
                  className="min-h-[48px]"
                />
                {paypalLoading && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Loading PayPal...
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
