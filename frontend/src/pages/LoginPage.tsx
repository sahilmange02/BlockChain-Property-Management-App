import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Loader, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth.api";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const ROLE_REDIRECT: Record<string, string> = {
  CITIZEN: "/dashboard",
  GOVERNMENT: "/government",
  ADMIN: "/admin",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const emailValue = watch("email");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await login(data.email, data.password);
      toast.success("Logged in successfully!");

      const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname;
      const user = JSON.parse(localStorage.getItem("user") || "{}") as { role?: string };
      navigate(from || (user.role ? ROLE_REDIRECT[user.role] : undefined) || "/dashboard", { replace: true });
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : undefined) ||
        err?.message ||
        "Login failed";

      const finalMessage =
        err?.response?.status === 429
          ? "Too many login attempts. Please wait 15 minutes and try again."
          : serverMessage;

      setServerError(finalMessage);

      // Check if it's an unverified email error
      if (err?.response?.status === 403 && serverMessage.includes("verify your email")) {
        setUnverifiedEmail(data.email);
      }

      toast.error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      const response = await authApi.resendVerificationEmail(unverifiedEmail);
      if (response.success) {
        toast.success("Verification email sent! Check your inbox.");
        setUnverifiedEmail(null);
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Land Registry</h1>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className={`p-4 rounded-lg text-sm flex gap-3 ${
                unverifiedEmail 
                  ? "bg-blue-900/20 border border-blue-800 text-blue-200" 
                  : "bg-red-900/20 border border-red-800 text-red-200"
              }`}>
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{serverError}</p>
                  {unverifiedEmail && (
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="mt-3 text-blue-300 hover:text-blue-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {resending ? (
                        <>
                          <Loader size={14} className="animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Mail size={14} /> Resend Verification Email
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {errors.email ? <p className="text-red-400 text-xs mt-1">{errors.email.message}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {errors.password ? <p className="text-red-400 text-xs mt-1">{errors.password.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader size={16} className="animate-spin" /> : null}
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

