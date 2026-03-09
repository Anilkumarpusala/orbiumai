"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else { setUser(data.user); setLoading(false); }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#333", fontSize: 13, fontFamily: "inherit" }}>Loading workspace...</div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Founder";

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: "#fff", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Sidebar */}
      <div style={{ width: 240, background: "#0A0A0A", borderRight: "1px solid #111", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0, minHeight: "100vh" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 20px 20px", borderBottom: "1px solid #111" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff" }}>O</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em" }}>Orbium</span>
        </div>

        {/* Workspace */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #111" }}>
          <p style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>WORKSPACE</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg,#6366F1,#EC4899)", flexShrink: 0 }} />
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}&apos;s Workspace</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 12px" }}>
          {[
            { icon: "⊞", label: "Dashboard", active: true },
            { icon: "👥", label: "Employees", active: false },
            { icon: "✦", label: "Tasks", active: false },
            { icon: "◎", label: "Activity", active: false },
            { icon: "⚿", label: "API Keys", active: false },
            { icon: "◈", label: "Billing", active: false },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: item.active ? "#fff08" : "transparent", marginBottom: 2, cursor: "pointer", transition: "background 0.15s" }}>
              <span style={{ fontSize: 14, opacity: item.active ? 1 : 0.4 }}>{item.icon}</span>
              <span style={{ color: item.active ? "#fff" : "#555", fontSize: 13, fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #111" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#6366F120", border: "1px solid #6366F130", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366F1", fontWeight: 800, fontSize: 12 }}>
              {name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
              <p style={{ color: "#444", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "8px", background: "transparent", border: "1px solid #1A1A1A", borderRadius: 8, color: "#444", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{ borderBottom: "1px solid #111", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>Good morning, {name.split(" ")[0]} 👋</h1>
            <p style={{ color: "#444", fontSize: 13, marginTop: 2 }}>Your AI team is ready for work</p>
          </div>
          <button style={{ background: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + New Task
          </button>
        </div>

        <div style={{ padding: "32px" }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
            {[
              { label: "Tasks Completed", value: "0", color: "#6366F1" },
              { label: "Active Employees", value: "4", color: "#06B6D4" },
              { label: "Credits Used", value: "0", color: "#EC4899" },
              { label: "Deliverables", value: "0", color: "#F59E0B" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 22px" }}>
                <p style={{ color: "#444", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 10 }}>{s.label.toUpperCase()}</p>
                <p style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Employees */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>Your Employees</h2>
              <span style={{ color: "#444", fontSize: 13 }}>4 employees</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
              {[
                { name: "Nova", role: "Developer Agent", color: "#6366F1", avatar: "N", status: "Idle" },
                { name: "Scout", role: "Research Agent", color: "#06B6D4", avatar: "S", status: "Idle" },
                { name: "Aria", role: "Marketing Agent", color: "#EC4899", avatar: "A", status: "Idle" },
                { name: "Rex", role: "Sales Agent", color: "#F59E0B", avatar: "R", status: "Idle" },
              ].map((emp, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px", cursor: "pointer", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: `${emp.color}15`, border: `1px solid ${emp.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: emp.color, fontWeight: 800, fontSize: 16 }}>{emp.avatar}</div>
                    <span style={{ fontSize: 10, color: "#444", fontWeight: 600, background: "#111", border: "1px solid #1A1A1A", borderRadius: 20, padding: "3px 10px" }}>● {emp.status}</span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", marginBottom: 2 }}>{emp.name}</h3>
                  <p style={{ color: emp.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{emp.role.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Empty tasks state */}
          <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#111", border: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>✦</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>No tasks yet</h3>
            <p style={{ color: "#444", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>Assign your first task to an employee and watch them work</p>
            <button style={{ background: "#fff", border: "none", borderRadius: 9, padding: "11px 24px", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Assign first task →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}