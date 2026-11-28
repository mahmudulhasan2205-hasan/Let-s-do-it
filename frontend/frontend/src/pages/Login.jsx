import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useLoginUserMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [loginUser, { isLoading, error }] = useLoginUserMutation();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const identifier = form.identifier.trim();
    const isEmail = identifier.includes("@");

    try {
      const data = await loginUser({
        email: isEmail ? identifier : "",
        username: isEmail ? "" : identifier,
        password: form.password,
        ...(twoFactorRequired ? { twoFactorCode } : {}),
      }).unwrap();

      dispatch(setCredentials(data));
      navigate("/");
    } catch (submitError) {
      const requiresCode = submitError?.data?.errors?.some((item) => item?.code === "TWO_FACTOR_REQUIRED");
      if (requiresCode) {
        setTwoFactorRequired(true);
      }
      console.error("Login failed:", submitError);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-[#0f0f0f] flex items-center justify-center p-5 text-white">
      <div className="w-full max-w-md bg-[#1c1c1c] border border-gray-800 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-center mb-8">
          Sign in to Lets-do-it
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2">Email or Username</label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="Enter email or username"
              required
              className="w-full bg-[#292929] border border-gray-700 rounded-lg p-3 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              className="w-full bg-[#292929] border border-gray-700 rounded-lg p-3 outline-none focus:border-red-500"
            />
          </div>

          {twoFactorRequired && (
            <div>
              <label className="block mb-2">Authenticator code</label>
              <input
                type="text"
                name="twoFactorCode"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                required
                className="w-full bg-[#292929] border border-gray-700 rounded-lg p-3 outline-none focus:border-red-500"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">
              {error?.data?.message || "Login failed. Please try again."}
            </p>
          )}

          <Link to="/forgot-password" className="block text-right text-sm text-red-400 hover:text-red-300">
            Forgot password?
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg py-3 font-semibold transition"
          >
            {isLoading ? "Signing in..." : twoFactorRequired ? "Verify and login" : "Login"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-red-500 hover:text-red-400">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
