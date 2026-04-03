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
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#191f31] rounded-3xl border border-[#2e3447] p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                verified 
                  ? 'bg-[#7bd0ff] bg-opacity-20' 
                  : 'bg-[#7bd0ff] bg-opacity-10 animate-pulse'
              }`}>
                {verified ? (
                  <CheckCircle className="text-[#7bd0ff]" size={48} />
                ) : (
                  <Mail className="text-[#7bd0ff]" size={48} />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#dce1fb]">
              {verified ? 'Email Verified!' : 'Verify Your Email'}
            </h1>
            <p className="text-[#dce1fb] space-y-2">
              {verified ? (
                <div className="text-lg text-[#7bd0ff] font-medium">
                  Your email has been verified. Redirecting to onboarding...
                </div>
              ) : (
                <>
                  <p>We sent a verification link to</p>
                  <p className="font-semibold text-[#7bd0ff] break-all">{email}</p>
                  <p className="text-sm">Click the link in your email to verify your account.</p>
                </>
              )}
            </p>
          </div>

          {!verified && (
            <>
              {/* Email Icon */}
              <div className="bg-[#151b2d] rounded-2xl border border-[#2e3447] p-8 text-center">
                <p className="text-sm text-[#dce1fb] leading-relaxed">
                  Check your inbox (and spam folder, just in case) for an email from MediScan NG.
                </p>
              </div>

              {/* Verification Steps */}
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#7bd0ff] text-[#0c1324] rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-[#dce1fb]">Open the email from MediScan NG</p>
                    <p className="text-sm text-[#8c91a8]">Look for the verification link</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#7bd0ff] text-[#0c1324] rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-[#dce1fb]">Click the verification link</p>
                    <p className="text-sm text-[#8c91a8]">This will verify your email</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#7bd0ff] text-[#0c1324] rounded-full flex items-center justify-center shrink-0 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-[#dce1fb]">Complete onboarding</p>
                    <p className="text-sm text-[#8c91a8]">Set up your organization profile</p>
                  </div>
                </div>
              </div>

              {/* Demo Button - Simulate verification */}
              <button
                onClick={handleVerified}
                className="w-full text-[#0c1324] py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #7bd0ff 0%, #008abb 100%)'
                }}
              >
                ✓ Email Verified (Demo)
              </button>

              {/* Resend Email */}
              <div className="bg-[#151b2d] rounded-xl border border-[#2e3447] p-4 text-center space-y-4">
                {resent && (
                  <div className="border border-[#7bd0ff] rounded-lg p-3 bg-[#7bd0ff] bg-opacity-10">
                    <p className="text-[#7bd0ff] text-sm font-medium">✓ Verification email resent!</p>
                  </div>
                )}
                <p className="text-sm text-[#dce1fb]">
                  Didn't receive the email?
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={resending || timer > 0}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    resending || timer > 0
                      ? 'bg-[#2e3447] text-[#8c91a8] cursor-not-allowed'
                      : 'border-2 border-[#7bd0ff] text-[#7bd0ff] hover:bg-[#7bd0ff] hover:bg-opacity-10'
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
