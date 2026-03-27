import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.api";
import { CheckCircle, XCircle, Loader, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          setError("No verification token provided.");
          setLoading(false);
          setShowResendForm(true);
          return;
        }

        // Call backend verify endpoint
        const response = await authApi.verifyEmail(token);

        if (response.success) {
          setSuccess(true);
          setError(null);
          toast.success("Email verified successfully! You can now log in.");
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        } else {
          setError(response.message || "Verification failed");
          setSuccess(false);
          toast.error(response.message || "Verification failed");
          setShowResendForm(true);
        }
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || "Verification failed";
        setError(errorMsg);
        setSuccess(false);
        toast.error(errorMsg);
        setShowResendForm(true);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setResending(true);
    try {
      const response = await authApi.resendVerificationEmail(resendEmail);
      if (response.success) {
        toast.success("Verification email sent! Check your inbox.");
        setResendEmail("");
        setShowResendForm(false);
      } else {
        toast.error(response.message || "Failed to resend email");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          {loading ? (
            <>
              <div className="flex justify-center mb-6">
                <Loader size={48} className="text-indigo-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
              <p className="text-gray-400">Please wait while we verify your email...</p>
            </>
          ) : success ? (
            <>
              <div className="flex justify-center mb-6">
                <CheckCircle size={48} className="text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-gray-400 mb-6">Your email has been successfully verified.</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition"
              >
                Go to Login
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <XCircle size={48} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-gray-400 mb-6">{error}</p>

              {showResendForm ? (
                <form onSubmit={handleResendEmail} className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex gap-3 items-start">
                      <Mail size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                      <div className="text-left">
                        <p className="text-blue-300 text-sm font-medium">Didn't receive the email?</p>
                        <p className="text-blue-200 text-sm">We can send you a new verification link</p>
                      </div>
                    </div>
                  </div>

                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <>
                        <Loader size={16} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} /> Resend Verification Email
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowResendForm(true)}
                  className="w-full mb-3 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Mail size={16} /> Resend Verification Email
                </button>
              )}

              <div className="space-y-3 mt-4">
                <button
                  onClick={() => navigate("/register")}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition text-sm"
                >
                  Back to Register
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg font-medium transition text-sm"
                >
                  Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
