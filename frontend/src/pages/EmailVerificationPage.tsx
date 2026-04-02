import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RotateCcw, CheckCircle } from 'lucide-react';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your@email.com';
  
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // TODO: Call backend API to resend email
      // await axios.post('/api/auth/organisations/resend-verification/', { email });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResent(true);
      setTimer(60);
      setTimeout(() => setResent(false), 3000);
    } catch (error) {
      console.error('Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  const handleVerified = () => {
    setVerified(true);
    setTimeout(() => {
      navigate('/onboarding');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                verified 
                  ? 'bg-green-100' 
                  : 'bg-blue-100 animate-pulse'
              }`}>
                {verified ? (
                  <CheckCircle className="text-green-600" size={48} />
                ) : (
                  <Mail className="text-blue-600" size={48} />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {verified ? 'Email Verified!' : 'Verify Your Email'}
            </h1>
            <p className="text-gray-600 space-y-2">
              {verified ? (
                <div className="text-lg text-green-600 font-medium">
                  Your email has been verified. Redirecting to onboarding...
                </div>
              ) : (
                <>
                  <p>We sent a verification link to</p>
                  <p className="font-semibold text-blue-600 break-all">{email}</p>
                  <p className="text-sm">Click the link in your email to verify your account.</p>
                </>
              )}
            </p>
          </div>

          {!verified && (
            <>
              {/* Email Icon */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Check your inbox (and spam folder, just in case) for an email from MediScan NG.
                </p>
              </div>

              {/* Verification Steps */}
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Open the email from MediScan NG</p>
                    <p className="text-sm text-gray-600">Look for the verification link</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Click the verification link</p>
                    <p className="text-sm text-gray-600">This will verify your email</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Complete onboarding</p>
                    <p className="text-sm text-gray-600">Set up your organization profile</p>
                  </div>
                </div>
              </div>

              {/* Demo Button - Simulate verification */}
              <button
                onClick={handleVerified}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold text-sm"
              >
                ✓ Email Verified (Demo)
              </button>

              {/* Resend Email */}
              <div className="bg-gray-50 rounded-xl p-4 text-center space-y-4">
                {resent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm font-medium">✓ Verification email resent!</p>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Didn't receive the email?
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={resending || timer > 0}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    resending || timer > 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <RotateCcw size={16} />
                  {resending ? 'Resending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend Email'}
                </button>
              </div>
            </>
          )}

          {/* Help Text */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>Questions? Contact our support team</p>
            <a href="mailto:support@mediscan.ng" className="text-blue-600 hover:underline font-medium">
              support@mediscan.ng
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
