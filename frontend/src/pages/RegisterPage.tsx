import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/services/api";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import toast from "react-hot-toast";

const step1Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum(["CITIZEN", "GOVERNMENT", "ADMIN"]),
});

const step2Schema = z.object({
  aadhaarNumber: z.string().min(12).max(14),
  panNumber: z.string().length(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
});

const step3Schema = z.object({
  password: z.string().min(8),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

export function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Step1Data & Step2Data & Step3Data>({
    name: "",
    email: "",
    phone: "",
    role: "CITIZEN",
    aadhaarNumber: "",
    panNumber: "",
    password: "",
  });

  const step1 = useForm<Step1Data>({
    // @ts-expect-error zod vs @hookform/resolvers type compatibility
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const step2 = useForm<Step2Data>({
    // @ts-expect-error zod vs @hookform/resolvers type compatibility
    resolver: zodResolver(step2Schema),
    defaultValues: formData,
  });

  const step3 = useForm<Step3Data>({
    // @ts-expect-error zod vs @hookform/resolvers type compatibility
    resolver: zodResolver(step3Schema),
    defaultValues: formData,
  });

  const onStep1 = step1.handleSubmit((data: Step1Data) => {
    setFormData((p) => ({ ...p, ...data }));
    setStep(2);
  });

  const onStep2 = step2.handleSubmit((data: Step2Data) => {
    setFormData((p) => ({ ...p, ...data }));
    setStep(3);
  });

  const onStep3 = step3.handleSubmit(async (data: Step3Data) => {
    setFormData((p) => ({ ...p, ...data }));
    setLoading(true);
    try {
      await api.post("/auth/register", { ...formData, ...data });
      toast.success("Registration successful");
      navigate("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  });

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Register for the land registry</p>

        <div className="h-2 bg-surface rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step === 1 && (
          <form onSubmit={onStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input
                {...step1.register("name")}
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              />
              {step1.formState.errors.name && (
                <p className="text-red-400 text-sm mt-1">{step1.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input
                {...step1.register("email")}
                type="email"
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              />
              {step1.formState.errors.email && (
                <p className="text-red-400 text-sm mt-1">{step1.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
              <input
                {...step1.register("phone")}
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              />
              {step1.formState.errors.phone && (
                <p className="text-red-400 text-sm mt-1">{step1.formState.errors.phone.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <select
                {...step1.register("role")}
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              >
                <option value="CITIZEN">Citizen</option>
                <option value="GOVERNMENT">Government</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg"
            >
              Next
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onStep2} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Aadhaar (masked)</label>
              <input
                {...step2.register("aadhaarNumber")}
                type="password"
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              />
              {step2.formState.errors.aadhaarNumber && (
                <p className="text-red-400 text-sm mt-1">{step2.formState.errors.aadhaarNumber.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">PAN (masked)</label>
              <input
                {...step2.register("panNumber")}
                placeholder="ABCDE1234F"
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white font-mono"
              />
              {step2.formState.errors.panNumber && (
                <p className="text-red-400 text-sm mt-1">{step2.formState.errors.panNumber.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-surface border border-gray-700 text-white rounded-lg"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={onStep3} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <input
                {...step3.register("password")}
                type="password"
                className="w-full px-4 py-3 bg-surface border border-gray-700 rounded-lg text-white"
              />
              {step3.formState.errors.password && (
                <p className="text-red-400 text-sm mt-1">{step3.formState.errors.password.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-surface border border-gray-700 text-white rounded-lg"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-accent hover:bg-emerald-500 text-primary font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-gray-500 mt-8">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Login
          </Link>
        </p>

        {step === 3 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            You can link your wallet later from the dashboard
          </p>
        )}
      </div>
    </div>
  );
}
