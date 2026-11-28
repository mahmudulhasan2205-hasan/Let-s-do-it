import { Link, useParams } from "react-router-dom";
import { useVerifyEmailQuery } from "@/features/auth/authApi";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const { token = "" } = useParams();
  const { data, isLoading, error } = useVerifyEmailQuery(token, { skip: !token });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-5 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1c1c1c] p-8 text-center">
        <h1 className="mb-3 text-3xl font-bold">Email verification</h1>
        {isLoading && <p className="text-sm text-gray-400">Verifying your email...</p>}
        {!isLoading && data?.emailVerified && <p className="text-sm text-emerald-300">Your email was verified successfully.</p>}
        {!isLoading && error && (
          <p className="text-sm text-red-300">{error.data?.message || "Verification link is invalid or has expired."}</p>
        )}
        <Button asChild className="mt-6 bg-red-600 text-white hover:bg-red-700">
          <Link to="/login">Go to login</Link>
        </Button>
      </div>
    </div>
  );
}
