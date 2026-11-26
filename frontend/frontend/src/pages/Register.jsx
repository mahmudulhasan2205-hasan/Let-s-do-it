import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, ImagePlus, UserRound } from "lucide-react";
import { useRegisterUserMutation } from "../features/auth/authApi";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formError, setFormError] = useState("");

  const [registerUser, { isLoading, isSuccess, error }] =
    useRegisterUserMutation();

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview("");
      return;
    }
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  useEffect(() => {
    if (!coverImage) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(coverImage);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverImage]);

  const handleChange = (e) => {
    setFormError("");
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleUsernameChange = (e) => {
    setFormError("");
    setForm({
      ...form,
      username: e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "")
        .slice(0, 30),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!avatar) {
      setFormError("Please add a profile photo.");
      return;
    }

    if (form.password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setFormError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const formData = new FormData();

    formData.append("fullName", form.fullName);
    formData.append("username", form.username);
    formData.append("email", form.email);
    formData.append("password", form.password);
    formData.append("avatar", avatar);

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    try {
      await registerUser(formData).unwrap();
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="register-page">
      <aside className="register-visual">
        {coverPreview ? (
          <img src={coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#7f1d1d_0%,#1c1c20_32%,#101114_72%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/90" />
        <Link to="/" className="register-brand relative z-10">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500 text-xl font-black">L</span>
          <span className="text-xl font-bold">Lets-do-it</span>
        </Link>
        <div className="register-visual-copy relative z-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-red-400">Create. Watch. Connect.</p>
          <h2>Share what moves you.</h2>
          <p>Join creators and discover videos from people around the world.</p>
          <div className="register-benefits">
            <span><Check size={15} /> Upload and share videos</span>
            <span><Check size={15} /> Build your creator profile</span>
            <span><Check size={15} /> Join the community</span>
          </div>
        </div>
      </aside>

      <main className="register-main">
        <Link to="/" className="register-back">
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="register-content">
          <div className="register-heading">
            <h1 className="text-4xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-zinc-400">Start sharing and watching great videos.</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-avatar-row">
              <label className="register-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="register-avatar-empty">
                    <UserRound size={22} />
                    Avatar
                  </span>
                )}
                {avatarPreview && <span className="register-avatar-edit"><ImagePlus size={14} /></span>}
                <input type="file" accept="image/jpeg,image/png,image/webp" required className="hidden"
                  onChange={(event) => setAvatar(event.target.files[0])} />
              </label>
              <div>
                <p className="font-semibold">Profile photo</p>
                <p className="mt-1 text-sm text-zinc-500">Required · JPG, PNG, or WebP · 5 MB max</p>
                {avatar && <p className="register-file-name">{avatar.name}</p>}
              </div>
            </div>

            <div className="register-fields">
              <label className="text-sm font-medium text-zinc-300">
                Full name
                <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                  placeholder="Alex Morgan" required autoComplete="name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#232429] px-4 py-3 text-white outline-none transition focus:border-red-500" />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Username
                <span className="register-username">
                  <span>@</span>
                  <input type="text" name="username" value={form.username} onChange={handleUsernameChange}
                    placeholder="alexmorgan" required autoComplete="username"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#232429] px-4 py-3 text-white outline-none transition focus:border-red-500" />
                </span>
              </label>
            </div>

            <label className="register-field register-field-full">
              Email address
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required autoComplete="email"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#232429] px-4 py-3 text-white outline-none transition focus:border-red-500" />
            </label>

            <div className="register-password-grid">
              <label className="register-password">
                Password
                <span>
                  <input type={showPassword ? "text" : "password"} name="password" value={form.password}
                    onChange={handleChange} placeholder="At least 8 characters" required minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-[#232429] px-4 py-3 pr-12 text-white outline-none transition focus:border-red-500" />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </label>
              <label className="register-password">
                Confirm password
                <span>
                  <input type={showPassword ? "text" : "password"} value={confirmPassword}
                    onChange={(event) => { setConfirmPassword(event.target.value); setFormError(""); }}
                    placeholder="Repeat password" required minLength={8} autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-[#232429] px-4 py-3 pr-12 text-white outline-none transition focus:border-red-500" />
                </span>
              </label>
            </div>

            <label className="register-cover">
              <ImagePlus size={20} />
              <span>
                {coverImage ? coverImage.name : "Add an optional cover image · JPG, PNG, or WebP · 5 MB max"}
              </span>
              {coverImage && <Check size={17} className="text-green-400" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(event) => setCoverImage(event.target.files[0])} />
            </label>

            <label className="register-terms">
              <input type="checkbox" checked={acceptedTerms}
                onChange={(event) => { setAcceptedTerms(event.target.checked); setFormError(""); }} />
              <span>I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</span>
            </label>

            {(formError || error) && (
              <p className="register-message register-message-error">
                {formError || error?.data?.message || "Registration failed. Please try again."}
              </p>
            )}
            {isSuccess && (
              <p className="register-message register-message-success">
                Account created successfully. Opening login...
              </p>
            )}

            <button type="submit" disabled={isLoading} className="register-submit">
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-red-400 hover:text-red-300">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;
