import { Link } from "react-router-dom";
import { CheckCircle, FileText, RefreshCw } from "lucide-react";

function Skyline() {
  // Lightweight inline SVG decoration (no external assets).
  return (
    <svg
      className="absolute inset-x-0 bottom-0 opacity-35"
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skylineStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* Buildings */}
      <path
        d="M0 220V160H90V220H0ZM120 220V120H210V220H120ZM240 220V95H310V220H240ZM330 220V140H420V220H330ZM450 220V70H540V220H450ZM570 220V135H660V220H570ZM690 220V105H780V220H690ZM810 220V155H910V220H810ZM930 220V85H1020V220H930ZM1050 220V145H1140V220H1050ZM1160 220V110H1200V220H1160Z"
        fill="none"
        stroke="url(#skylineStroke)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Ground glow */}
      <path
        d="M0 210H1200"
        fill="none"
        stroke="rgba(99,102,241,0.25)"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle gradient glow background (CSS-only). */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(closest-side at 20% 10%, rgba(99,102,241,0.35), transparent 55%), radial-gradient(closest-side at 80% 0%, rgba(16,185,129,0.18), transparent 50%), radial-gradient(closest-side at 60% 90%, rgba(236,72,153,0.12), transparent 55%)",
        }}
      />
      <div className="absolute left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="max-w-6xl mx-auto px-4 py-12 relative">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: marketing copy */}
          <div className="text-left">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-indigo-200 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2">
              <span className="block h-2 w-2 rounded-full bg-indigo-400" />
              Secure, verifiable property records
            </p>

            <h1 className="mt-5 text-3xl md:text-5xl font-bold text-white leading-tight">
              Blockchain Land Registry
            </h1>
            <p className="mt-4 text-gray-300 max-w-xl">
              Register properties, store documents on Pinata IPFS, and manage ownership verification with
              an audit-friendly on-chain timeline.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/properties"
                className="btn-primary inline-flex items-center justify-center w-full sm:w-auto"
              >
                Explore Properties
              </Link>
              <Link
                to="/register"
                className="btn-secondary inline-flex items-center justify-center w-full sm:w-auto"
              >
                Create Account
              </Link>
              <Link to="/login" className="text-gray-300 hover:text-white mt-1">
                I already have an account
              </Link>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} className="text-green-300" />
                  <div className="font-semibold text-white text-sm">Ownership Verification</div>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  Tamper-evident history for approvals, updates, and transfers.
                </div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-200" />
                  <div className="font-semibold text-white text-sm">IPFS Document Storage</div>
                </div>
                <div className="mt-2 text-sm text-gray-400">Store documents off-chain and verify by CID references.</div>
              </div>
            </div>
          </div>

          {/* Right: decorative card */}
          <div className="relative">
            <div className="absolute -inset-1 -z-10 rounded-[1.2rem] bg-gradient-to-b from-indigo-500/20 via-gray-900/0 to-transparent blur-xl" />
            <div className="bg-gray-950/40 border border-gray-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-indigo-200 text-sm font-medium">Get started in minutes</div>
                  <div className="mt-1 text-white font-bold text-xl">Your property, verified.</div>
                </div>
                <div className="hidden sm:block rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
                  <RefreshCw size={22} className="text-indigo-200" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-200 font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Register property details</div>
                    <div className="text-sm text-gray-400">Add survey info and document reference points.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-200 font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Store and verify documents</div>
                    <div className="text-sm text-gray-400">Use Pinata IPFS so files are verifiable by CID.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-200 font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Transfer with an audit trail</div>
                    <div className="text-sm text-gray-400">View activity and keep ownership changes traceable.</div>
                  </div>
                </div>
              </div>
            </div>

            <Skyline />
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Built for transparency</h2>
              <p className="mt-2 text-gray-400 max-w-2xl">
                A consistent experience for citizens, governments, and admins—designed around verifiability.
              </p>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <CheckCircle size={20} className="text-indigo-200" />
                </div>
                <div className="text-xs text-indigo-200/80 font-medium">Verified</div>
              </div>
              <div className="mt-4 text-white font-semibold">Ownership status that stands</div>
              <div className="mt-2 text-sm text-gray-400">
                Reduce disputes with structured verification states and an immutable timeline.
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileText size={20} className="text-emerald-200" />
                </div>
                <div className="text-xs text-emerald-200/80 font-medium">Off-chain docs</div>
              </div>
              <div className="mt-4 text-white font-semibold">IPFS storage by CID</div>
              <div className="mt-2 text-sm text-gray-400">
                Keep documents accessible while anchoring integrity via content identifiers.
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                  <RefreshCw size={20} className="text-fuchsia-200" />
                </div>
                <div className="text-xs text-fuchsia-200/80 font-medium">Traceable</div>
              </div>
              <div className="mt-4 text-white font-semibold">Transfers you can audit</div>
              <div className="mt-2 text-sm text-gray-400">
                Record changes and verify ownership transitions through the app’s activity views.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

