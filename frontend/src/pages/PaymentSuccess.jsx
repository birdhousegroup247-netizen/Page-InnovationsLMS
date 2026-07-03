import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentsAPI } from '../lib/api';
import { CheckCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const paystackRef = searchParams.get('reference');
  const paypalOrderId = searchParams.get('order_id');
  const gateway = searchParams.get('gateway');

  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fallbackErr = (e) =>
      setError(
        e.response?.data?.message ||
          'Could not verify payment status. Your enrollment may still be processing — please check My Courses.'
      );

    if (gateway === 'paypal' && paypalOrderId) {
      paymentsAPI
        .verifyPayPalPayment(paypalOrderId)
        .then((res) => setPaymentData(res.data.data))
        .catch(fallbackErr)
        .finally(() => setVerifying(false));
      return;
    }

    if (gateway === 'paystack' && paystackRef) {
      paymentsAPI
        .verifyPaystackPayment(paystackRef)
        .then((res) => setPaymentData(res.data.data))
        .catch(fallbackErr)
        .finally(() => setVerifying(false));
      return;
    }

    if (!sessionId) {
      setVerifying(false);
      setError('No payment session found. Please check My Courses.');
      return;
    }

    paymentsAPI
      .verifyPayment(sessionId)
      .then((res) => setPaymentData(res.data.data))
      .catch(fallbackErr)
      .finally(() => setVerifying(false));
  }, [sessionId, paystackRef, paypalOrderId, gateway]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <img src={logo} alt="Page Innovation" className="h-10 w-auto mx-auto" />
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {verifying ? (
          <div className="py-6">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Verifying your payment...</p>
          </div>
        ) : error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Processed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{error}</p>
            <Link
              to="/my-courses"
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              Go to My Courses
            </Link>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {paymentData?.course?.title ? (
                <>
                  You're now enrolled in{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {paymentData.course.title}
                  </strong>
                  .
                </>
              ) : (
                "You're now enrolled! Full access has been granted."
              )}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              A receipt has been sent to your email. You can start learning right now.
            </p>

            {paymentData?.payment_plan === 'installment' && paymentData?.installment_remaining && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-left">
                <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Installment Plan Active
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-xs">
                  Your remaining balance of{' '}
                  <strong>${parseFloat(paymentData.installment_remaining).toFixed(2)}</strong> is
                  due in 21 days. You'll receive a reminder email 7 days before it's due.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {paymentData?.course?.id && (
                <Link
                  to={`/courses/${paymentData.course.id}/learn`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Start Learning
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <Link
                to="/my-courses"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                View My Courses
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        Need help?{' '}
        <a href="mailto:support@pageinnovation.com" className="text-brand-blue hover:underline">
          Contact Support
        </a>
      </p>
    </div>
  );
}
