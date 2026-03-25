import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Loader } from "lucide-react";
import { authApi } from "../api/auth.api";

const step1Schema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().length(10, "Phone must be exactly 10 digits").regex(/^[0-9]{10}$/, "Phone must contain digits only"),
});

const step2Schema = z.object({
  aadhaarNumber: z
    .string()
    .length(12, "Aadhaar must be 12 digits")
    .regex(/^\d+$/, "Digits only"),
  panNumber: z
    .string()
    .length(10, "PAN must be 10 characters")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Format: AAAAA9999A"),
});

const step3Schema = z
  .object({
    password: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Step1 & Step2 & Step3>>({});

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) });

  const handleStep1 = form1.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
  });

  const handleStep2 = form2.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(3);
  });

  const handleStep3 = form3.handleSubmit(async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name as string,
        email: formData.email as string,
        phone: Number(formData.phone),
        password: data.password,
        aadhaarNumber: formData.aadhaarNumber as string,
        panNumber: formData.panNumber as string,
      };

      await authApi.register({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        aadhaarNumber: payload.aadhaarNumber,
        panNumber: payload.panNumber,
      });

      toast.success("Registration successful! Please login.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 mt-2">Step {step} of 3</p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded ${s <= step ? "bg-indigo-500" : "bg-gray-700"}`} />
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <h2 className="text-white font-semibold text-lg mb-4">Personal Details</h2>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                <input
                  {...form1.register("name")}
                  className="input-field"
                  placeholder="Harshal Dama"
                />
                {form1.formState.errors.name ? (
                  <p className="err">{form1.formState.errors.name.message}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input
                  {...form1.register("email")}
                  className="input-field"
                  placeholder="harshal@email.com"
                />
                {form1.formState.errors.email ? (
                  <p className="err">{form1.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Phone</label>
                <input
                  {...form1.register("phone")}
                  className="input-field"
                  placeholder="123456789"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                />
                {form1.formState.errors.phone ? (
                  <p className="err">{form1.formState.errors.phone.message}</p>
                ) : null}
              </div>

              <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2 mt-6">
                Next <ChevronRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <h2 className="text-white font-semibold text-lg mb-4">KYC Verification</h2>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Aadhaar Number</label>
                <input
                  {...form2.register("aadhaarNumber")}
                  className="input-field font-mono"
                  placeholder="123456789012"
                  maxLength={12}
                />
                {form2.formState.errors.aadhaarNumber ? (
                  <p className="err">{form2.formState.errors.aadhaarNumber.message}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">PAN Number</label>
                <input
                  {...form2.register("panNumber")}
                  className="input-field font-mono uppercase"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
                {form2.formState.errors.panNumber ? (
                  <p className="err">{form2.formState.errors.panNumber.message}</p>
                ) : null}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <h2 className="text-white font-semibold text-lg mb-4">Set Password</h2>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <input
                  {...form3.register("password")}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {form3.formState.errors.password ? (
                  <p className="err">{form3.formState.errors.password.message}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                <input
                  {...form3.register("confirmPassword")}
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                {form3.formState.errors.confirmPassword ? (
                  <p className="err">{form3.formState.errors.confirmPassword.message}</p>
                ) : null}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(2)} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {isLoading ? <Loader size={16} className="animate-spin" /> : null}
                  {isLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

