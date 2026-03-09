"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) { setError(error.message); setLoading(false); }
    else setDone(true);
  };

  if (done) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: "24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#052e16", border: "1px solid #16a34a40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 24px" }}>✓</div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 12 }}>Check your email</h2>
        <p style={{ color: "#555", fontSize: 15, lineHeight: 1.6 }}>We sent a confirmation link to <span style={{ color: "#6366F1" }}>{email}</span>. Click it to activate your account.</p>
        <a href="/login" style={{ display: "inline-block", marginTop: 28, color: "#6366F1", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>← Back to login</a>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: "24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input{outline:none;} input:focus{border-color:#6366F1 !important;}`}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 48, justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff" }}>O</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#fff" }}>Orbium</span>
        </div>

        {/* Card */}
        <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 20, padding: "36px 32px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, color: "#fff" }}>Create your workspace</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Your AI team is waiting</p>

          {error && (
            <div style={{ background: "#1A0A0A", border: "1px solid #3A1A1A", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#666", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>YOUR NAME</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Anil Kumar"
              style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", transition: "border-color 0.2s" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#666", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", transition: "border-color 0.2s" }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ color: "#666", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              onKeyDown={e => e.key === "Enter" && handleSignup()}
              style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", transition: "border-color 0.2s" }}
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading || !email || !password || !name}
            style={{ width: "100%", padding: "13px", background: loading || !email || !password || !name ? "#1A1A1A" : "#fff", border: "none", borderRadius: 10, color: loading || !email || !password || !name ? "#333" : "#000", fontWeight: 800, fontSize: 14, cursor: loading || !email || !password || !name ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "-0.02em", transition: "all 0.2s" }}
          >
            {loading ? "Creating workspace..." : "Create workspace →"}
          </button>

          <p style={{ color: "#444", fontSize: 13, textAlign: "center", marginTop: 20 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#6366F1", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
          </p>
        </div>

        <p style={{ color: "#333", fontSize: 12, textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}