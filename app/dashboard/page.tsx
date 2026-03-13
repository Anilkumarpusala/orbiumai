"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EMPLOYEES = [
  {
    name: "Nova", role: "Developer", avatar: "N", color: "#6366F1", bg: "#6366F115",
    description: "Builds websites, apps, APIs and code",
    handles: ["build", "code", "website", "app", "landing", "api", "dashboard", "deploy", "create", "develop"],
    steps: ["Reading your requirements...", "Planning the solution...", "Writing the code...", "Testing the output...", "Preparing deliverables..."],
    system_prompt: `You are Nova, a senior full-stack developer at Orbium AI. You are part of a user's AI team helping them build their business. You have deep context about their company and goals.

You write clean, production-ready code. Always structure your response exactly like this:

## What Nova Built
Clear summary of what you did.

## How It Works
Brief explanation of the approach.

## Deliverables
\`\`\`
// filename: component.tsx
// Full working code here
\`\`\`

## Deploy Instructions
Step by step to get this live.

## What's Next
2-3 suggested follow-up tasks Nova or the team could do.`
  },
  {
    name: "Scout", role: "Researcher", avatar: "S", color: "#06B6D4", bg: "#06B6D415",
    description: "Researches markets, competitors and finds leads",
    handles: ["research", "find", "competitor", "market", "leads", "analyze", "discover", "search", "data", "report"],
    steps: ["Scanning the market...", "Analyzing competitors...", "Extracting key insights...", "Building your report...", "Finalizing findings..."],
    system_prompt: `You are Scout, a senior research analyst at Orbium AI. You are part of a user's AI team helping them understand their market and grow their business.

You find deep, accurate, actionable information. Always structure your response exactly like this:

## What Scout Found
Clear summary of research completed.

## Key Insights
The most important findings with context.

## Detailed Report
Full structured data, tables, comparisons.

## Recommended Actions
What the user should do with this information.

## What's Next
2-3 follow-up research tasks or actions for the team.`
  },
  {
    name: "Aria", role: "Marketer", avatar: "A", color: "#EC4899", bg: "#EC489915",
    description: "Creates content, campaigns and marketing strategy",
    handles: ["market", "content", "copy", "campaign", "write", "post", "social", "email", "brand", "launch", "promote"],
    steps: ["Understanding your brand...", "Researching your audience...", "Crafting the strategy...", "Writing your content...", "Finalizing assets..."],
    system_prompt: `You are Aria, a senior marketing strategist at Orbium AI. You are part of a user's AI team helping them grow their business and reach their audience.

You write in the user's brand voice and create content that converts. Always structure your response exactly like this:

## What Aria Created
Clear summary of what was produced.

## The Strategy
Why this approach works for their audience.

## Deliverables
The actual content, copy, campaign or strategy in full.

## How To Use This
Exactly how to deploy and get results.

## What's Next
2-3 follow-up tasks to amplify this work.`
  },
  {
    name: "Rex", role: "Sales", avatar: "R", color: "#F59E0B", bg: "#F59E0B15",
    description: "Finds leads, writes outreach and drives sales",
    handles: ["sales", "leads", "outreach", "email", "prospect", "customer", "pitch", "follow", "crm", "revenue"],
    steps: ["Identifying your ideal prospects...", "Researching each company...", "Writing personalised outreach...", "Building your lead list...", "Preparing sales assets..."],
    system_prompt: `You are Rex, a senior sales strategist at Orbium AI. You are part of a user's AI team helping them find customers and grow revenue.

You specialise in outreach, lead generation and closing. Always structure your response exactly like this:

## What Rex Delivered
Clear summary of sales work completed.

## The Approach
Strategy and reasoning behind the outreach.

## Deliverables
Lead lists, email sequences, scripts or sales assets in full.

## Next Steps
Exact follow-up sequence to maximise results.

## What's Next
2-3 follow-up tasks to keep the pipeline moving.`
  },
];

const SUGGESTED_GOALS = [
  { icon: "🚀", text: "Build a landing page for my product", employee: "Nova" },
  { icon: "🔍", text: "Research my top 5 competitors", employee: "Scout" },
  { icon: "📧", text: "Write a cold email campaign for leads", employee: "Rex" },
  { icon: "📣", text: "Create a product launch strategy", employee: "Aria" },
  { icon: "💻", text: "Build a pricing page with Stripe", employee: "Nova" },
  { icon: "📊", text: "Analyze my target market", employee: "Scout" },
];

function smartAssign(goal: string) {
  const lower = goal.toLowerCase();
  for (const emp of EMPLOYEES) {
    if (emp.handles.some(h => lower.includes(h))) return emp;
  }
  return EMPLOYEES[0];
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any>({});
  const [goal, setGoal] = useState("");
  const [assignedEmp, setAssignedEmp] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [taskError, setTaskError] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("home");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyProvider, setKeyProvider] = useState("gemini");
  const [thinkingStep, setThinkingStep] = useState(-1);
  const [empStatus, setEmpStatus] = useState<Record<string, string>>({
    Nova: "idle", Scout: "idle", Aria: "idle", Rex: "idle"
  });
  const [companyMemory, setCompanyMemory] = useState({
    name: "", industry: "", audience: "", product: "", tone: ""
  });
  const [copied, setCopied] = useState(false);
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
        setTimeout(() => setShowMemoryModal(true), 800);
      }
      setWorkspace(ws);
      if (ws?.company_memory) {
        try { setCompanyMemory(JSON.parse(ws.company_memory)); } catch {}
      }

      const { data: keys } = await supabase.from("api_keys").select("*").eq("user_id", data.user.id);
      const keyMap: any = {};
      keys?.forEach((k: any) => { keyMap[k.provider] = k.encrypted_key; });
      setApiKeys(keyMap);

      if (!keys || keys.length === 0) setTimeout(() => setShowKeyModal(true), 1200);

      const { data: taskData } = await supabase.from("tasks").select("*")
        .eq("workspace_id", ws?.id).order("created_at", { ascending: false }).limit(30);
      setTasks(taskData || []);
      setActivity((taskData || []).map((t: any) => ({
        message: t.status === "completed"
          ? `✓ ${t.title}`
          : t.status === "failed"
          ? `✗ ${t.title}`
          : `⟳ ${t.title}`,
        time: t.created_at,
        status: t.status,
        output: t.output,
      })));
      setLoading(false);
    });
  }, []);

  // Smart assign employee as user types
  useEffect(() => {
    if (goal.trim().length > 3) {
      setAssignedEmp(smartAssign(goal));
    } else {
      setAssignedEmp(null);
    }
  }, [goal]);

  const runGoal = async () => {
    if (!goal.trim()) return;
    const provider = Object.keys(apiKeys)[0];
    const apiKey = apiKeys[provider];
    if (!apiKey) { setShowKeyModal(true); return; }

    const employee = assignedEmp || EMPLOYEES[0];
    setRunning(true);
    setOutput("");
    setTaskError("");
    setThinkingStep(0);
    setEmpStatus(prev => ({ ...prev, [employee.name]: "running" }));
    setActiveTab("home");

    const { data: task } = await supabase.from("tasks").insert({
      workspace_id: workspace.id,
      employee_id: null,
      title: goal.slice(0, 60),
      prompt: goal,
      status: "running",
    }).select().single();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < employee.steps.length) setThinkingStep(step);
      else clearInterval(interval);
    }, 1400);

    const memCtx = companyMemory.name
      ? `Company: ${companyMemory.name}\nIndustry: ${companyMemory.industry}\nProduct: ${companyMemory.product}\nAudience: ${companyMemory.audience}\nTone: ${companyMemory.tone}\n\n`
      : "";

    const modelMap: any = {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-20241022",
      gemini: "gemini-2.0-flash",
      grok: "grok-2-latest",
      mistral: "mistral-large-latest",
      deepseek: "deepseek-chat",
    };

    try {
      const res = await fetch("/api/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${memCtx}Goal: ${goal}`,
          systemPrompt: employee.system_prompt,
          model: modelMap[provider] || "gpt-4o",
          apiKey,
          provider,
        }),
      });

      clearInterval(interval);
      setThinkingStep(employee.steps.length);

      const result = await res.json();
      if (result.error) {
        setTaskError(result.error);
        setEmpStatus(prev => ({ ...prev, [employee.name]: "idle" }));
        if (task) await supabase.from("tasks").update({ status: "failed" }).eq("id", task.id);
      } else {
        setOutput(result.output);
        setEmpStatus(prev => ({ ...prev, [employee.name]: "done" }));
        if (task) await supabase.from("tasks").update({ output: result.output, status: "completed" }).eq("id", task.id);
        setTasks(prev => [{ ...task, output: result.output, status: "completed" }, ...prev]);
        setActivity(prev => [{
          message: `✓ ${goal.slice(0, 50)}`,
          time: new Date().toISOString(),
          status: "completed",
          output: result.output,
        }, ...prev]);
        setTimeout(() => setEmpStatus(prev => ({ ...prev, [employee.name]: "idle" })), 4000);
      }
    } catch {
      clearInterval(interval);
      setTaskError("Something went wrong. Check your API key and try again.");
      setEmpStatus(prev => ({ ...prev, [employee.name]: "idle" }));
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
    await supabase.from("workspaces")
      .update({ company_memory: JSON.stringify(companyMemory) })
      .eq("id", workspace.id);
    setShowMemoryModal(false);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff", margin: "0 auto 16px" }}>O</div>
        <p style={{ color: "#333", fontSize: 13 }}>Getting your workspace ready...</p>
      </div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Founder";
  const firstName = name.split(" ")[0];
  const hasKey = Object.keys(apiKeys).length > 0;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: "#fff", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        textarea { outline: none; resize: none; }
        textarea:focus { border-color: #6366F1 !important; }
        input { outline: none; }
        input:focus { border-color: #6366F1 !important; }
        .ni { transition: background 0.15s; cursor: pointer; }
        .ni:hover { background: #0D0D0D !important; }
        .sg { transition: all 0.2s; cursor: pointer; border: 1px solid #1A1A1A !important; }
        .sg:hover { border-color: #333 !important; transform: translateY(-1px); }
        .ec { transition: all 0.2s; cursor: pointer; }
        .ec:hover { opacity: 0.85; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #6366F120} 50%{box-shadow:0 0 40px #6366F140} }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 2px; }
      `}</style>

      {/* MEMORY MODAL */}
      {showMemoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 500, animation: "fadeIn 0.3s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, color: "#fff", marginBottom: 20 }}>O</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>Let's set up your AI team</h2>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>Tell us about your business so your team can hit the ground running. They'll remember this forever.</p>
            </div>
            {[
              { key: "name", label: "What's your company called?", placeholder: "e.g. Orbium AI" },
              { key: "industry", label: "What industry are you in?", placeholder: "e.g. SaaS, E-commerce, Agency, Freelance" },
              { key: "product", label: "What do you sell or build?", placeholder: "e.g. AI workforce platform for founders" },
              { key: "audience", label: "Who are your customers?", placeholder: "e.g. Startup founders, Small businesses" },
              { key: "tone", label: "How does your brand sound?", placeholder: "e.g. Bold and direct, Friendly, Professional" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ color: "#555", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>{field.label}</label>
                <input
                  value={companyMemory[field.key as keyof typeof companyMemory]}
                  onChange={e => setCompanyMemory(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", background: "#111", border: "1px solid #1A1A1A", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 13, fontFamily: "inherit", transition: "border-color 0.2s" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowMemoryModal(false)} style={{ padding: "12px 20px", background: "transparent", border: "1px solid #1A1A1A", borderRadius: 10, color: "#444", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Skip for now
              </button>
              <button onClick={saveMemory} style={{ flex: 1, padding: "12px", background: "#fff", border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                Set up my team →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEY MODAL */}
      {showKeyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 24, padding: "36px 32px", width: "100%", maxWidth: 440, animation: "fadeIn 0.25s ease" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>Connect your AI</h2>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>Your team needs an AI key to work. Gemini is free and takes 2 minutes.</p>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#06B6D4", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 24 }}>
              → Get a free Gemini key here
            </a>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#555", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Choose your AI provider</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
                {["gemini", "openai", "anthropic", "grok", "mistral", "deepseek"].map(p => (
                  <button key={p} onClick={() => setKeyProvider(p)} style={{ padding: "8px 4px", background: keyProvider === p ? "#fff" : "#111", border: `1px solid ${keyProvider === p ? "#fff" : "#1A1A1A"}`, borderRadius: 8, color: keyProvider === p ? "#000" : "#555", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" as const, transition: "all 0.15s" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#555", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Paste your API key</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveApiKey()}
                placeholder={keyProvider === "openai" ? "sk-..." : keyProvider === "anthropic" ? "sk-ant-..." : "AIza..."}
                style={{ width: "100%", background: "#111", border: "1px solid #1A1A1A", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowKeyModal(false)} style={{ padding: "12px 16px", background: "transparent", border: "1px solid #1A1A1A", borderRadius: 10, color: "#444", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Later</button>
              <button onClick={saveApiKey} disabled={!keyInput.trim()} style={{ flex: 1, padding: "12px", background: keyInput.trim() ? "#fff" : "#1A1A1A", border: "none", borderRadius: 10, color: keyInput.trim() ? "#000" : "#333", fontSize: 14, fontWeight: 800, cursor: keyInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s" }}>
                Connect my team →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: 210, background: "#050505", borderRight: "1px solid #0D0D0D", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: "100vh", position: "fixed", top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #0D0D0D" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6366F1,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "#fff" }}>O</div>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.03em", color: "#fff" }}>Orbium</span>
          </a>
        </div>

        <div style={{ padding: "10px 10px 6px" }}>
          <div onClick={() => setShowMemoryModal(true)} style={{ background: "#0A0A0A", border: "1px solid #111", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg,#6366F1,#EC4899)", flexShrink: 0 }} />
            <span style={{ color: "#666", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{companyMemory.name || workspace?.name}</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { id: "home", icon: "⌂", label: "Home" },
            { id: "tasks", icon: "✦", label: "Tasks" },
            { id: "team", icon: "◈", label: "My Team" },
            { id: "activity", icon: "◎", label: "Activity" },
            { id: "keys", icon: "⚿", label: "API Keys" },
          ].map(item => (
            <div key={item.id} onClick={() => setActiveTab(item.id)} className="ni" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, background: activeTab === item.id ? "#ffffff08" : "transparent" }}>
              <span style={{ fontSize: 12, opacity: activeTab === item.id ? 1 : 0.25 }}>{item.icon}</span>
              <span style={{ color: activeTab === item.id ? "#fff" : "#444", fontSize: 13, fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Team status */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #0D0D0D", borderBottom: "1px solid #0D0D0D" }}>
          <p style={{ color: "#222", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>TEAM</p>
          {EMPLOYEES.map(emp => (
            <div key={emp.name} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: empStatus[emp.name] === "running" ? emp.color : empStatus[emp.name] === "done" ? "#4ade80" : "#1A1A1A", animation: empStatus[emp.name] === "running" ? "pulse 1s infinite" : "none", flexShrink: 0, transition: "background 0.3s" }} />
              <span style={{ color: empStatus[emp.name] === "running" ? emp.color : "#333", fontSize: 11, fontWeight: empStatus[emp.name] === "running" ? 700 : 400, transition: "color 0.3s" }}>{emp.name}</span>
              <span style={{ color: "#1A1A1A", fontSize: 9, marginLeft: "auto" }}>{empStatus[emp.name] === "running" ? "working" : empStatus[emp.name] === "done" ? "done ✓" : "idle"}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "#6366F110", border: "1px solid #6366F115", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366F1", fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
              {name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#666", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName}</p>
              <p style={{ color: "#222", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "6px", background: "transparent", border: "1px solid #111", borderRadius: 6, color: "#2A2A2A", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: 210, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

            {/* Header */}
            <div style={{ padding: "32px 36px 0" }}>
              <h1 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6 }}>
                {completedTasks === 0
                  ? `Welcome, ${firstName}. What are we building?`
                  : `Good to have you back, ${firstName}.`}
              </h1>
              <p style={{ color: "#444", fontSize: 14, marginBottom: 32 }}>
                {completedTasks === 0
                  ? "Your AI team is ready. Just tell them what you need."
                  : `Your team has completed ${completedTasks} task${completedTasks > 1 ? "s" : ""} so far. What's next?`}
              </p>

              {/* No key warning */}
              {!hasKey && (
                <div onClick={() => setShowKeyModal(true)} style={{ background: "#0A0A0A", border: "1px solid #F59E0B20", borderLeft: "3px solid #F59E0B", borderRadius: 12, padding: "14px 18px", marginBottom: 24, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Your team is waiting for an AI key</p>
                    <p style={{ color: "#555", fontSize: 12 }}>Gemini is free and takes 2 minutes to set up → click here</p>
                  </div>
                  <span style={{ color: "#F59E0B", fontSize: 18 }}>→</span>
                </div>
              )}

              {/* Goal Input */}
              <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 18, padding: 20, marginBottom: 24, animation: "glow 4s infinite" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ paddingTop: 2 }}>
                    {assignedEmp ? (
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: assignedEmp.bg, border: `1px solid ${assignedEmp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: assignedEmp.color, fontWeight: 900, fontSize: 15, transition: "all 0.3s" }}>
                        {assignedEmp.avatar}
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#111", border: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        ✦
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !running) { e.preventDefault(); runGoal(); } }}
                      placeholder="What do you want to build, research, or automate today?"
                      rows={3}
                      disabled={running}
                      style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 15, fontFamily: "inherit", lineHeight: 1.6, opacity: running ? 0.5 : 1 }}
                    />
                    {assignedEmp && !running && (
                      <p style={{ color: assignedEmp.color, fontSize: 12, fontWeight: 600, marginTop: 4, animation: "fadeIn 0.2s ease" }}>
                        → {assignedEmp.name} will handle this
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    onClick={runGoal}
                    disabled={running || !goal.trim()}
                    style={{ padding: "11px 28px", background: running || !goal.trim() ? "#1A1A1A" : assignedEmp ? assignedEmp.color : "#6366F1", border: "none", borderRadius: 10, color: running || !goal.trim() ? "#333" : "#000", fontWeight: 800, fontSize: 14, cursor: running || !goal.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                  >
                    {running ? `${assignedEmp?.name || "Team"} is working...` : "Let's go →"}
                  </button>
                </div>
              </div>
            </div>

            {/* Thinking workspace */}
            {running && assignedEmp && thinkingStep >= 0 && (
              <div style={{ margin: "0 36px 24px", background: "#0A0A0A", border: `1px solid ${assignedEmp.color}20`, borderRadius: 16, padding: 22, animation: "fadeIn 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: assignedEmp.bg, display: "flex", alignItems: "center", justifyContent: "center", color: assignedEmp.color, fontWeight: 900, fontSize: 13 }}>{assignedEmp.avatar}</div>
                  <p style={{ color: assignedEmp.color, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>{assignedEmp.name.toUpperCase()} IS WORKING ON YOUR GOAL</p>
                  <div style={{ marginLeft: "auto", width: 14, height: 14, border: `2px solid ${assignedEmp.color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                </div>
                {assignedEmp.steps.map((step: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: i > thinkingStep ? 0.1 : i < thinkingStep ? 0.35 : 1, transition: "all 0.4s" }}>
                    <span style={{ color: i < thinkingStep ? "#4ade80" : i === thinkingStep ? assignedEmp.color : "#222", fontSize: 12, width: 16, flexShrink: 0, fontWeight: 900 }}>
                      {i < thinkingStep ? "✓" : i === thinkingStep ? "▶" : "○"}
                    </span>
                    <span style={{ color: i === thinkingStep ? "#fff" : i < thinkingStep ? "#444" : "#1A1A1A", fontSize: 13, fontWeight: i === thinkingStep ? 600 : 400 }}>
                      {assignedEmp.name} is {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Output / Deliverable */}
            {(output || taskError) && !running && (
              <div style={{ margin: "0 36px 24px", background: "#0A0A0A", border: `1px solid ${taskError ? "#3A1A1A" : "#1A1A1A"}`, borderRadius: 16, padding: 24, animation: "fadeIn 0.4s ease" }}>
                {taskError ? (
                  <div>
                    <p style={{ color: "#f87171", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Something went wrong</p>
                    <p style={{ color: "#f87171", fontSize: 13, opacity: 0.7 }}>{taskError}</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #111" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
                      <p style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>DELIVERABLE READY</p>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button onClick={copyOutput} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 7, padding: "5px 12px", color: copied ? "#4ade80" : "#555", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "color 0.2s" }}>
                          {copied ? "Copied ✓" : "Copy"}
                        </button>
                        <button onClick={() => { setOutput(""); setGoal(""); setAssignedEmp(null); }} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 7, padding: "5px 12px", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                          New goal
                        </button>
                      </div>
                    </div>
                    <div style={{ color: "#CCC", fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                      {output}
                    </div>
                    {/* Suggest next actions */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #111" }}>
                      <p style={{ color: "#333", fontSize: 12, marginBottom: 10 }}>What should we do next?</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                        {["Improve this", "Share with team", "Assign follow-up to Scout", "Have Rex find leads for this"].map((s, i) => (
                          <button key={i} onClick={() => { setGoal(s); setOutput(""); }} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 20, padding: "6px 14px", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suggested goals */}
            {!running && !output && (
              <div style={{ padding: "0 36px 36px" }}>
                <p style={{ color: "#222", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>YOUR TEAM SUGGESTS</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
                  {SUGGESTED_GOALS.map((s, i) => (
                    <div key={i} onClick={() => setGoal(s.text)} className="sg" style={{ background: "#0A0A0A", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <div>
                          <p style={{ color: "#888", fontSize: 13, lineHeight: 1.4, marginBottom: 3 }}>{s.text}</p>
                          <p style={{ color: "#333", fontSize: 11 }}>{s.employee} will handle this</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div style={{ padding: "32px 36px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Tasks</h1>
            <p style={{ color: "#444", fontSize: 13, marginBottom: 24 }}>{tasks.length} tasks total · {completedTasks} completed</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.length === 0 ? (
                <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ color: "#333", fontSize: 14, marginBottom: 16 }}>No tasks yet</p>
                  <button onClick={() => setActiveTab("home")} style={{ background: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Give your team a goal →</button>
                </div>
              ) : tasks.map((task, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{task.title}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: task.status === "completed" ? "#052e16" : task.status === "failed" ? "#1A0505" : "#1A1A1A", color: task.status === "completed" ? "#4ade80" : task.status === "failed" ? "#f87171" : "#555" }}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ color: "#444", fontSize: 12, marginBottom: task.output ? 12 : 0 }}>{task.prompt}</p>
                  {task.output && (
                    <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 9, padding: 12, color: "#666", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 160, overflow: "auto" }}>
                      {task.output.slice(0, 400)}{task.output.length > 400 ? "\n\n..." : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "team" && (
          <div style={{ padding: "32px 36px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Your Team</h1>
            <p style={{ color: "#444", fontSize: 13, marginBottom: 24 }}>4 AI employees ready to work</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {EMPLOYEES.map((emp, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -24, right: -24, width: 100, height: 100, background: `radial-gradient(circle,${emp.color}06 0%,transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: emp.bg, border: `1px solid ${emp.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: emp.color }}>
                      {emp.avatar}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: empStatus[emp.name] === "running" ? emp.bg : "#111", color: empStatus[emp.name] === "running" ? emp.color : "#333", animation: empStatus[emp.name] === "running" ? "pulse 1.5s infinite" : "none" }}>
                      ● {empStatus[emp.name] === "running" ? "WORKING" : "IDLE"}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 3, letterSpacing: "-0.02em" }}>{emp.name}</h3>
                  <p style={{ color: emp.color, fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: "0.08em" }}>{emp.role.toUpperCase()}</p>
                  <p style={{ color: "#444", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{emp.description}</p>
                  <button onClick={() => { setGoal(`${emp.name}, `); setActiveTab("home"); }} style={{ width: "100%", padding: "10px", background: emp.color, border: "none", borderRadius: 9, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Give {emp.name} a goal →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <div style={{ padding: "32px 36px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Activity</h1>
            <p style={{ color: "#444", fontSize: 13, marginBottom: 24 }}>Everything your team has done</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activity.length === 0 ? (
                <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ color: "#333", fontSize: 14 }}>No activity yet. Give your team a goal to get started.</p>
                </div>
              ) : activity.map((item, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.status === "completed" ? "#4ade80" : item.status === "failed" ? "#f87171" : "#555", flexShrink: 0 }} />
                  <p style={{ color: "#888", fontSize: 13, flex: 1 }}>{item.message}</p>
                  <p style={{ color: "#222", fontSize: 11, flexShrink: 0 }}>{new Date(item.time).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API KEYS TAB */}
        {activeTab === "keys" && (
          <div style={{ padding: "32px 36px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>API Keys</h1>
            <p style={{ color: "#444", fontSize: 13, marginBottom: 24 }}>Your team uses these keys to think and work</p>
            <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 14, padding: 22, marginBottom: 14, maxWidth: 560 }}>
              {Object.keys(apiKeys).length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ color: "#333", fontSize: 14, marginBottom: 16 }}>No keys connected yet</p>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "#06B6D4", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 16, textDecoration: "none" }}>→ Get a free Gemini key here</a>
                </div>
              ) : Object.entries(apiKeys).map(([provider, key]: any) => (
                <div key={provider} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#111", border: "1px solid #1A1A1A", borderRadius: 10, marginBottom: 8 }}>
                  <div>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, textTransform: "capitalize" as const }}>{provider}</p>
                    <p style={{ color: "#333", fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>{key.slice(0, 10)}••••••••</p>
                  </div>
                  <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, background: "#052e16", borderRadius: 20, padding: "3px 10px" }}>● ACTIVE</span>
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
  );
}