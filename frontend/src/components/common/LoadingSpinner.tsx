export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-300">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

