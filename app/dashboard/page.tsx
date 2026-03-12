"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EMPLOYEES = [
  {
    name: "Nova", role: "Developer Agent", avatar: "N", color: "#6366F1", bg: "#6366F115",
    steps: ["Analyzing task requirements...", "Planning solution architecture...", "Writing code...", "Testing output...", "Preparing deliverables..."],
    system_prompt: `You are Nova, a senior full-stack developer. You write clean, production-ready code. Always format your response exactly like this:

## Task Summary
What you understood and did.

## Steps Taken
Step by step breakdown.

## Deliverables
\`\`\`
// Code with filename comments
\`\`\`

## Next Actions
Suggested follow-up tasks.`
  },
  {
    name: "Scout", role: "Research Agent", avatar: "S", color: "#06B6D4", bg: "#06B6D415",
    steps: ["Scanning market landscape...", "Analyzing competitors...", "Extracting key data...", "Building comparison matrix...", "Preparing research report..."],
    system_prompt: `You are Scout, a senior research analyst. You find deep, accurate, actionable information. Always format your response exactly like this:

## Task Summary
What you researched and why.

## Key Findings
Detailed findings with context.

## Deliverables
Structured data, tables, or reports.

## Next Actions
What to do with this information.`
  },
  {
    name: "Aria", role: "Marketing Agent", avatar: "A", color: "#EC4899", bg: "#EC489915",
    steps: ["Studying your brand voice...", "Analyzing target audience...", "Crafting messaging strategy...", "Writing content...", "Preparing campaign assets..."],
    system_prompt: `You are Aria, a senior marketing strategist. You write in the user's brand voice and create content that converts. Always format your response exactly like this:

## Task Summary
What you created and the strategy behind it.

## Steps Taken
Your creative process.

## Deliverables
The actual marketing content, copy, or campaign.

## Next Actions
How to deploy and measure this.`
  },
  {
    name: "Rex", role: "Sales Agent", avatar: "R", color: "#F59E0B", bg: "#F59E0B15",
    steps: ["Identifying target prospects...", "Researching companies...", "Writing personalised outreach...", "Building lead list...", "Preparing sales assets..."],
    system_prompt: `You are Rex, a senior sales strategist. You specialise in outreach, lead generation, and closing. Always format your response exactly like this:

## Task Summary
What sales work you completed.

## Steps Taken
Your research and strategy.

## Deliverables
Lead lists, outreach messages, or sales assets.

## Next Actions
Follow-up sequence and next steps.`
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any>({});
  const [selectedEmp, setSelectedEmp] = useState(EMPLOYEES[0]);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [taskError, setTaskError] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyProvider, setKeyProvider] = useState("openai");
  const [thinkingStep, setThinkingStep] = useState(-1);
  const [empStatus, setEmpStatus] = useState<Record<string, string>>({ Nova: "idle", Scout: "idle", Aria: "idle", Rex: "idle" });
  const [companyMemory, setCompanyMemory] = useState({ name: "", industry: "", audience: "", product: "", tone: "" });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);

      let { data: ws } = await supabase
        .from("workspaces").select("*").eq("user_id", data.user.id).single();

      if (!ws) {
        const n = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Founder";
        const { data: newWs } = await supabase
          .from("workspaces")
          .insert({ user_id: data.user.id, name: `${n}'s Workspace` })
          .select().single();
        ws = newWs;
        setTimeout(() => setShowMemoryModal(true), 1000);
      }
      setWorkspace(ws);
      if (ws?.company_memory) {
        try { setCompanyMemory(JSON.parse(ws.company_memory)); } catch {}
      }

      const { data: keys } = await supabase.from("api_keys").select("*").eq("user_id", data.user.id);
      const keyMap: any = {};
      keys?.forEach((k: any) => { keyMap[k.provider] = k.encrypted_key; });
      setApiKeys(keyMap);

      const { data: taskData } = await supabase.from("tasks").select("*")
        .eq("workspace_id", ws?.id).order("created_at", { ascending: false }).limit(20);
      setTasks(taskData || []);

      const activityItems = (taskData || []).map((t: any) => ({
        message: t.status === "completed" ? `${t.title} completed` : `${t.title} — ${t.status}`,
        time: t.created_at,
        status: t.status,
      }));
      setActivity(activityItems);

      setLoading(false);
    });
  }, []);

  const runTask = async () => {
    if (!taskPrompt.trim()) return;
    const provider = Object.keys(apiKeys)[0];
    const apiKey = apiKeys[provider];
    if (!apiKey) { setShowKeyModal(true); return; }

    setRunning(true);
    setOutput("");
    setTaskError("");
    setThinkingStep(0);
    setEmpStatus(prev => ({ ...prev, [selectedEmp.name]: "running" }));

    const { data: task } = await supabase.from("tasks").insert({
      workspace_id: workspace.id,
      employee_id: null,
      title: taskTitle || taskPrompt.slice(0, 60),
      prompt: taskPrompt,
      status: "running",
    }).select().single();

    // Animate thinking steps
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step < selectedEmp.steps.length) {
        setThinkingStep(step);
      } else {
        clearInterval(stepInterval);
      }
    }, 1200);

    const memoryContext = companyMemory.name
      ? `Company: ${companyMemory.name}\nIndustry: ${companyMemory.industry}\nAudience: ${companyMemory.audience}\nProduct: ${companyMemory.product}\nTone: ${companyMemory.tone}\n\n`
      : "";

    try {
      const res = await fetch("/api/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${memoryContext}${taskPrompt}`,
          systemPrompt: selectedEmp.system_prompt,
          model: provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gemini-1.5-flash",
          apiKey,
          provider,
        }),
      });

      clearInterval(stepInterval);
      setThinkingStep(selectedEmp.steps.length);

      const result = await res.json();
      if (result.error) {
        setTaskError(result.error);
        setEmpStatus(prev => ({ ...prev, [selectedEmp.name]: "idle" }));
        if (task) await supabase.from("tasks").update({ status: "failed" }).eq("id", task.id);
      } else {
        setOutput(result.output);
        setEmpStatus(prev => ({ ...prev, [selectedEmp.name]: "done" }));
        if (task) await supabase.from("tasks").update({ output: result.output, status: "completed" }).eq("id", task.id);
        const newTask = { ...task, output: result.output, status: "completed" };
        setTasks(prev => [newTask, ...prev]);
        setActivity(prev => [{ message: `${selectedEmp.name} completed "${taskTitle || taskPrompt.slice(0, 40)}"`, time: new Date().toISOString(), status: "completed" }, ...prev]);
        setTimeout(() => setEmpStatus(prev => ({ ...prev, [selectedEmp.name]: "idle" })), 3000);
      }
    } catch {
      clearInterval(stepInterval);
      setTaskError("Something went wrong. Check your API key and try again.");
      setEmpStatus(prev => ({ ...prev, [selectedEmp.name]: "idle" }));
    }

    setRunning(false);
    setThinkingStep(-1);
  };

  const saveApiKey = async () => {
    if (!keyInput.trim() || !user) return;
    await supabase.from("api_keys").upsert(
      { user_id: user.id, provider: keyProvider, encrypted_key: keyInput },
      { onConflict: "user_id,provider" }
    );
    setApiKeys((prev: any) => ({ ...prev, [keyProvider]: keyInput }));
    setKeyInput("");
    setShowKeyModal(false);
  };

  const saveMemory = async () => {
    if (!workspace) return;
    await supabase.from("workspaces").update({ company_memory: JSON.stringify(companyMemory) }).eq("id", workspace.id);
    setShowMemoryModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", margin: "0 auto 16px" }}>O</div>
        <p style={{ color: "#333", fontSize: 13 }}>Loading workspace...</p>
      </div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Founder";
  const hasApiKey = Object.keys(apiKeys).length > 0;

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: "#fff", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        textarea { outline: none; resize: none; }
        textarea:focus { border-color: #6366F1 !important; }
        input { outline: none; }
        input:focus { border-color: #6366F1 !important; }
        select { outline: none; }
        .ni { transition: background 0.15s; cursor: pointer; }
        .ni:hover { background: #111 !important; }
        .ec { transition: all 0.2s; cursor: pointer; }
        .ec:hover { transform: translateY(-2px); }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 2px; }
      `}</style>

      {/* COMPANY MEMORY MODAL */}
      {showMemoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 20, padding: 36, width: "100%", maxWidth: 480, animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff" }}>O</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>Set up company memory</h2>
            </div>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 28, paddingLeft: 42 }}>Your AI team will remember this for every task</p>

            {[
              { key: "name", label: "COMPANY NAME", placeholder: "e.g. Orbium AI" },
              { key: "industry", label: "INDUSTRY", placeholder: "e.g. SaaS, E-commerce, Agency" },
              { key: "audience", label: "TARGET AUDIENCE", placeholder: "e.g. Founders, SMBs, Developers" },
              { key: "product", label: "PRODUCT / SERVICE", placeholder: "e.g. AI workforce platform" },
              { key: "tone", label: "BRAND TONE", placeholder: "e.g. Professional, Friendly, Bold" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{field.label}</label>
                <input
                  value={companyMemory[field.key as keyof typeof companyMemory]}
                  onChange={e => setCompanyMemory(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", background: "#111", border: "1px solid #1A1A1A", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", transition: "border-color 0.2s" }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowMemoryModal(false)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #222", borderRadius: 10, color: "#555", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Skip for now
              </button>
              <button onClick={saveMemory} style={{ flex: 2, padding: "12px", background: "#fff", border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                Save memory →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEY MODAL */}
      {showKeyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, animation: "fadeIn 0.25s ease" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Connect API Key</h2>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 24 }}>Your key is stored securely and never shared</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>PROVIDER</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["openai", "anthropic", "gemini"].map(p => (
                  <button key={p} onClick={() => setKeyProvider(p)} style={{ flex: 1, padding: "9px 4px", background: keyProvider === p ? "#fff" : "#111", border: `1px solid ${keyProvider === p ? "#fff" : "#222"}`, borderRadius: 8, color: keyProvider === p ? "#000" : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" as const, transition: "all 0.15s" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>API KEY</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveApiKey()}
                placeholder={keyProvider === "openai" ? "sk-..." : keyProvider === "anthropic" ? "sk-ant-..." : "AIza..."}
                style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", transition: "border-color 0.2s" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowKeyModal(false)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #222", borderRadius: 10, color: "#555", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveApiKey} disabled={!keyInput.trim()} style={{ flex: 2, padding: "12px", background: keyInput.trim() ? "#fff" : "#1A1A1A", border: "none", borderRadius: 10, color: keyInput.trim() ? "#000" : "#333", fontSize: 14, fontWeight: 800, cursor: keyInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s" }}>
                Save Key →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: 220, background: "#0A0A0A", borderRight: "1px solid #111", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh", position: "fixed", top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "#fff" }}>O</div>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.03em", color: "#fff" }}>Orbium</span>
          </a>
        </div>

        <div style={{ padding: "10px 10px 6px" }}>
          <p style={{ color: "#2A2A2A", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", padding: "0 6px", marginBottom: 6 }}>WORKSPACE</p>
          <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setShowMemoryModal(true)}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg,#6366F1,#EC4899)", flexShrink: 0 }} />
            <span style={{ color: "#888", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspace?.name}</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { id: "dashboard", icon: "⊞", label: "Dashboard" },
            { id: "tasks", icon: "✦", label: "Tasks" },
            { id: "employees", icon: "👥", label: "Employees" },
            { id: "activity", icon: "◎", label: "Activity" },
            { id: "apikeys", icon: "⚿", label: "API Keys" },
          ].map(item => (
            <div key={item.id} onClick={() => setActiveTab(item.id)} className="ni" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, background: activeTab === item.id ? "#ffffff0A" : "transparent" }}>
              <span style={{ fontSize: 13, opacity: activeTab === item.id ? 1 : 0.3 }}>{item.icon}</span>
              <span style={{ color: activeTab === item.id ? "#fff" : "#444", fontSize: 13, fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Employee status indicators */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #111", borderBottom: "1px solid #111" }}>
          <p style={{ color: "#2A2A2A", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>TEAM STATUS</p>
          {EMPLOYEES.map(emp => (
            <div key={emp.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: empStatus[emp.name] === "running" ? emp.color : empStatus[emp.name] === "done" ? "#4ade80" : "#2A2A2A", animation: empStatus[emp.name] === "running" ? "pulse 1.5s infinite" : "none", flexShrink: 0 }} />
              <span style={{ color: empStatus[emp.name] === "running" ? emp.color : "#444", fontSize: 11, fontWeight: empStatus[emp.name] === "running" ? 700 : 400, transition: "color 0.3s" }}>{emp.name}</span>
              <span style={{ color: "#2A2A2A", fontSize: 10, marginLeft: "auto" }}>{empStatus[emp.name] === "running" ? "working" : empStatus[emp.name] === "done" ? "done" : "idle"}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#6366F115", border: "1px solid #6366F120", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366F1", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#888", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
              <p style={{ color: "#2A2A2A", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "7px", background: "transparent", border: "1px solid #1A1A1A", borderRadius: 7, color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Top bar */}
        <div style={{ borderBottom: "1px solid #111", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)", zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>
              {activeTab === "dashboard" && `Good morning, ${name.split(" ")[0]} 👋`}
              {activeTab === "tasks" && "Tasks"}
              {activeTab === "employees" && "Your Employees"}
              {activeTab === "activity" && "Activity Feed"}
              {activeTab === "apikeys" && "API Keys"}
            </h1>
            <p style={{ color: "#333", fontSize: 12, marginTop: 2 }}>
              {activeTab === "dashboard" && "Your AI team is ready for work"}
              {activeTab === "tasks" && `${tasks.length} tasks total`}
              {activeTab === "employees" && "4 employees active"}
              {activeTab === "activity" && `${activity.length} events`}
              {activeTab === "apikeys" && `${Object.keys(apiKeys).length} key connected`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowMemoryModal(true)} style={{ background: "transparent", border: "1px solid #1A1A1A", borderRadius: 8, padding: "8px 14px", color: "#444", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ⚙ Memory
            </button>
            {!hasApiKey ? (
              <button onClick={() => setShowKeyModal(true)} style={{ background: "#6366F1", border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + Connect API Key
              </button>
            ) : (
              <button onClick={() => setActiveTab("dashboard")} style={{ background: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + New Task
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: "24px 28px", flex: 1 }}>

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Tasks Done", value: tasks.filter(t => t.status === "completed").length },
                  { label: "Employees", value: 4 },
                  { label: "API Keys", value: Object.keys(apiKeys).length },
                  { label: "Deliverables", value: tasks.filter(t => t.output).length },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: "16px 18px" }}>
                    <p style={{ color: "#2A2A2A", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>{s.label.toUpperCase()}</p>
                    <p style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em" }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* No API key banner */}
              {!hasApiKey && (
                <div style={{ background: "#0A0A0A", border: "1px solid #F59E0B25", borderLeft: "3px solid #F59E0B", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>No API key connected</p>
                    <p style={{ color: "#444", fontSize: 12 }}>Connect OpenAI, Anthropic or Gemini to start running tasks</p>
                  </div>
                  <button onClick={() => setShowKeyModal(true)} style={{ background: "#F59E0B", border: "none", borderRadius: 8, padding: "9px 16px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: 16 }}>
                    Connect →
                  </button>
                </div>
              )}

              {/* Task Runner */}
              <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 16, padding: 22, marginBottom: 20 }}>
                <p style={{ color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 16 }}>ASSIGN TASK</p>

                {/* Employee selector */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
                  {EMPLOYEES.map((emp, i) => {
                    const isSelected = selectedEmp.name === emp.name;
                    const status = empStatus[emp.name];
                    return (
                      <div
                        key={i}
                        onClick={() => !running && setSelectedEmp(emp)}
                        className="ec"
                        style={{ background: isSelected ? emp.bg : "#111", border: `1px solid ${isSelected ? emp.color + "50" : "#1A1A1A"}`, borderRadius: 11, padding: "12px 8px", textAlign: "center" as const, opacity: running && !isSelected ? 0.4 : 1 }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: emp.bg, border: `1px solid ${emp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: emp.color, fontWeight: 900, fontSize: 13, margin: "0 auto 7px", position: "relative" }}>
                          {emp.avatar}
                          {status === "running" && (
                            <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: emp.color, animation: "pulse 1s infinite" }} />
                          )}
                        </div>
                        <p style={{ color: isSelected ? "#fff" : "#444", fontSize: 11, fontWeight: 700 }}>{emp.name}</p>
                        <p style={{ color: status === "running" ? emp.color : "#2A2A2A", fontSize: 9, fontWeight: 600, marginTop: 2 }}>{status === "running" ? "WORKING" : status === "done" ? "DONE" : "IDLE"}</p>
                      </div>
                    );
                  })}
                </div>

                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Task title (optional)"
                  disabled={running}
                  style={{ width: "100%", background: "#111", border: "1px solid #1A1A1A", borderRadius: 9, padding: "10px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", marginBottom: 10, transition: "border-color 0.2s", opacity: running ? 0.5 : 1 }}
                />

                <textarea
                  value={taskPrompt}
                  onChange={e => setTaskPrompt(e.target.value)}
                  placeholder={`What do you want ${selectedEmp.name} to do? Be specific.`}
                  rows={4}
                  disabled={running}
                  style={{ width: "100%", background: "#111", border: "1px solid #1A1A1A", borderRadius: 9, padding: "11px 13px", color: "#fff", fontSize: 13, fontFamily: "inherit", marginBottom: 14, transition: "border-color 0.2s", opacity: running ? 0.5 : 1 }}
                />

                <button
                  onClick={runTask}
                  disabled={running || !taskPrompt.trim()}
                  style={{ width: "100%", padding: "13px", background: running || !taskPrompt.trim() ? "#1A1A1A" : selectedEmp.color, border: "none", borderRadius: 10, color: running || !taskPrompt.trim() ? "#333" : "#000", fontWeight: 800, fontSize: 14, cursor: running || !taskPrompt.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                >
                  {running ? `${selectedEmp.name} is working...` : `Run with ${selectedEmp.name} →`}
                </button>
              </div>

              {/* THINKING WORKSPACE */}
              {running && thinkingStep >= 0 && (
                <div style={{ background: "#0A0A0A", border: `1px solid ${selectedEmp.color}30`, borderRadius: 16, padding: 22, marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: selectedEmp.bg, border: `1px solid ${selectedEmp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: selectedEmp.color, fontWeight: 900, fontSize: 12 }}>{selectedEmp.avatar}</div>
                    <p style={{ color: selectedEmp.color, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>{selectedEmp.name.toUpperCase()} IS WORKING</p>
                    <div style={{ marginLeft: "auto", width: 14, height: 14, border: `2px solid ${selectedEmp.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                  {selectedEmp.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: i > thinkingStep ? 0.15 : i < thinkingStep ? 0.4 : 1, transition: "opacity 0.4s", animation: i === thinkingStep ? "fadeIn 0.3s ease" : "none" }}>
                      <span style={{ color: i < thinkingStep ? "#4ade80" : i === thinkingStep ? selectedEmp.color : "#2A2A2A", fontSize: 11, fontWeight: 900, width: 14, flexShrink: 0 }}>
                        {i < thinkingStep ? "✓" : i === thinkingStep ? "▶" : "○"}
                      </span>
                      <span style={{ color: i === thinkingStep ? "#fff" : i < thinkingStep ? "#555" : "#2A2A2A", fontSize: 13, fontWeight: i === thinkingStep ? 600 : 400 }}>
                        {selectedEmp.name} is {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* OUTPUT */}
              {(output || taskError) && !running && (
                <div style={{ background: "#0A0A0A", border: `1px solid ${taskError ? "#3A1A1A" : "#1A1A1A"}`, borderRadius: 16, padding: 22, animation: "fadeIn 0.4s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: taskError ? "#f87171" : "#4ade80" }} />
                    <p style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
                      {taskError ? "ERROR" : "DELIVERABLE"}
                    </p>
                    {output && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(output); }}
                        style={{ marginLeft: "auto", background: "transparent", border: "1px solid #1A1A1A", borderRadius: 6, padding: "4px 10px", color: "#444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                  {taskError && <p style={{ color: "#f87171", fontSize: 13 }}>{taskError}</p>}
                  {output && (
                    <div style={{ color: "#CCC", fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                      {output}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.length === 0 ? (
                <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ color: "#2A2A2A", fontSize: 14, marginBottom: 16 }}>No tasks yet</p>
                  <button onClick={() => setActiveTab("dashboard")} style={{ background: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Assign first task →
                  </button>
                </div>
              ) : tasks.map((task, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{task.title}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: task.status === "completed" ? "#052e16" : task.status === "failed" ? "#1A0505" : "#1A1A1A", color: task.status === "completed" ? "#4ade80" : task.status === "failed" ? "#f87171" : "#555" }}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ color: "#444", fontSize: 12, marginBottom: task.output ? 12 : 0, lineHeight: 1.5 }}>{task.prompt}</p>
                  {task.output && (
                    <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 9, padding: 12, color: "#666", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 180, overflow: "auto" }}>
                      {task.output.slice(0, 500)}{task.output.length > 500 ? "..." : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === "employees" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {EMPLOYEES.map((emp, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: 22, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle,${emp.color}06 0%,transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: emp.bg, border: `1px solid ${emp.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: emp.color }}>
                      {emp.avatar}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: empStatus[emp.name] === "running" ? emp.bg : "#111", border: `1px solid ${empStatus[emp.name] === "running" ? emp.color + "40" : "#1A1A1A"}`, color: empStatus[emp.name] === "running" ? emp.color : "#333", animation: empStatus[emp.name] === "running" ? "pulse 1.5s infinite" : "none" }}>
                      ● {empStatus[emp.name] === "running" ? "WORKING" : empStatus[emp.name] === "done" ? "DONE" : "IDLE"}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 3, letterSpacing: "-0.02em" }}>{emp.name}</h3>
                  <p style={{ color: emp.color, fontSize: 10, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>{emp.role.toUpperCase()}</p>
                  <p style={{ color: "#333", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Trained on your business. Gets smarter with every task.</p>
                  <button onClick={() => { setSelectedEmp(emp); setActiveTab("dashboard"); }} style={{ width: "100%", padding: "10px", background: emp.color, border: "none", borderRadius: 9, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Assign Task →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activity.length === 0 ? (
                <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ color: "#2A2A2A", fontSize: 14 }}>No activity yet. Assign a task to get started.</p>
                </div>
              ) : activity.map((item, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.status === "completed" ? "#4ade80" : item.status === "failed" ? "#f87171" : "#555", flexShrink: 0 }} />
                  <p style={{ color: "#888", fontSize: 13, flex: 1 }}>{item.message}</p>
                  <p style={{ color: "#2A2A2A", fontSize: 11, flexShrink: 0 }}>{new Date(item.time).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* API KEYS TAB */}
          {activeTab === "apikeys" && (
            <div>
              <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: 22, marginBottom: 14 }}>
                <p style={{ color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 16 }}>CONNECTED KEYS</p>
                {Object.keys(apiKeys).length === 0 ? (
                  <p style={{ color: "#2A2A2A", fontSize: 14 }}>No keys connected yet.</p>
                ) : Object.entries(apiKeys).map(([provider, key]: any) => (
                  <div key={provider} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#111", border: "1px solid #1A1A1A", borderRadius: 10, marginBottom: 8 }}>
                    <div>
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, textTransform: "capitalize" as const }}>{provider}</p>
                      <p style={{ color: "#333", fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>{key.slice(0, 10)}••••••••</p>
                    </div>
                    <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, background: "#052e16", border: "1px solid #16a34a20", borderRadius: 20, padding: "3px 10px" }}>● ACTIVE</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowKeyModal(true)} style={{ background: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + Add API Key
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}