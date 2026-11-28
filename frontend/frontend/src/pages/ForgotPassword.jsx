import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "@/features/auth/authApi";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await forgotPassword(email.trim()).unwrap();
      setMessage("If that account exists, a reset link has been sent.");
    } catch (requestError) {
      setMessage(requestError.data?.message || "Could not send the reset link.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-5 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1c1c1c] p-8">
        <h1 className="mb-2 text-3xl font-bold">Forgot password</h1>
        <p className="mb-8 text-sm text-gray-400">Enter your account email to receive a reset link.</p>
        <label className="mb-2 block text-sm">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-gray-700 bg-[#292929] p-3 outline-none focus:border-red-500"
        />
        {(message || error) && <p className="mt-4 text-sm text-gray-300">{message}</p>}
        <Button type="submit" disabled={isLoading || !email.trim()} className="mt-5 w-full bg-red-600 text-white hover:bg-red-700">
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
        <Link to="/login" className="mt-6 block text-center text-sm text-red-400 hover:text-red-300">Back to login</Link>
      </form>
    </div>
  );
}
