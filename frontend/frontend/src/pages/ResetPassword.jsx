import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useResetPasswordMutation } from "@/features/auth/authApi";
import { Button } from "@/components/ui/button";

export default function ResetPassword() {
  const { token = "" } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      await resetPassword({ token, password }).unwrap();
      setMessage("Password reset successfully. You can now sign in.");
    } catch (requestError) {
      setMessage(requestError.data?.message || "Could not reset the password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-5 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1c1c1c] p-8">
        <h1 className="mb-2 text-3xl font-bold">Reset password</h1>
        <p className="mb-8 text-sm text-gray-400">Choose a new password for your account.</p>
        <label className="mb-2 block text-sm">New password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          className="mb-4 w-full rounded-lg border border-gray-700 bg-[#292929] p-3 outline-none focus:border-red-500"
        />
        <label className="mb-2 block text-sm">Confirm password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
          className="w-full rounded-lg border border-gray-700 bg-[#292929] p-3 outline-none focus:border-red-500"
        />
        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
        <Button type="submit" disabled={isLoading || !password || password !== confirmPassword} className="mt-5 w-full bg-red-600 text-white hover:bg-red-700">
          {isLoading ? "Resetting..." : "Reset password"}
        </Button>
        <Link to="/login" className="mt-6 block text-center text-sm text-red-400 hover:text-red-300">Back to login</Link>
      </form>
    </div>
  );
}
