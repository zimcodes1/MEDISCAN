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
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-brand-card rounded-3xl border border-brand-border p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center transition-all bg-linear-to-br from-brand-primary to-brand-secondary">
                {verified ? (
                  <CheckCircle className="text-brand-bg" size={48} />
                ) : (
                  <Mail className="text-brand-bg" size={48} />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-brand-text">
              {verified ? 'Email Verified!' : 'Verify Your Email'}
            </h1>
            <p className="text-brand-text space-y-2">
              {verified ? (
                <div className="text-lg text-brand-primary font-medium">
                  Your email has been verified. Redirecting to onboarding...
                </div>
              ) : (
                <>
                  <p>We sent a verification link to</p>
                  <p className="font-semibold text-brand-primary break-all">{email}</p>
                  <p className="text-sm">Click the link in your email to verify your account.</p>
                </>
              )}
            </p>
          </div>

          {!verified && (
            <>
              {/* Email Icon */}
              <div className="bg-brand-bg rounded-2xl border border-brand-border p-6 sm:p-8 text-center">
                <p className="text-sm text-brand-text leading-relaxed">
                  Check your inbox (and spam folder, just in case) for an email from MediScan NG.
                </p>
              </div>

              {/* Verification Steps */}
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-brand-primary text-brand-bg rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-brand-text">Open the email from MediScan NG</p>
                    <p className="text-sm text-[#8c91a8]">Look for the verification link</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-brand-primary text-brand-bg rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-brand-text">Click the verification link</p>
                    <p className="text-sm text-[#8c91a8]">This will verify your email</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-brand-primary text-brand-bg rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-brand-text">Complete onboarding</p>
                    <p className="text-sm text-[#8c91a8]">Set up your organization profile</p>
                  </div>
                </div>
              </div>

              {/* Demo Button - Simulate verification */}
              <button
                onClick={handleVerified}
                className="w-full text-brand-bg bg-linear-to-r from-brand-primary to-brand-secondary cursor-pointer py-3 rounded-xl font-semibold text-sm"
              >
                ✓ Email Verified (Demo)
              </button>

              {/* Resend Email */}
              <div className="bg-brand-bg rounded-xl border border-brand-border p-4 text-center space-y-4">
                {resent && (
                  <div className="border border-brand-primary rounded-xl p-3 bg-brand-primary bg-opacity-10">
                    <p className="text-brand-bg text-sm font-medium">✓ Verification email resent!</p>
                  </div>
                )}
                <p className="text-sm text-brand-text">
                  Didn't receive the email?
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={resending || timer > 0}
                  className={`w-full px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    resending || timer > 0
                      ? 'bg-brand-bborder-brand-border text-[#8c91a8] cursor-not-allowed'
                      : 'border-2 border-brand-primary text-brand-primary hover:text-brand-bg hover:bg-brand-primary hover:bg-opacity-10'
                  }`}
                >
                  <RotateCcw size={16} />
                  {resending ? 'Resending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend Email'}
                </button>
              </div>
            </>
          )}

          {/* Help Text */}
          <div className="text-center text-sm text-[#8c91a8] space-y-2">
            <p>Questions? Contact our support team</p>
            <a href="mailto:support@mediscan.ng" className="text-[#7bd0ff] hover:underline font-medium">
              support@mediscan.ng
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
