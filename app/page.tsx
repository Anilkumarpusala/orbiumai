"use client";
import { useState, useEffect } from "react";

const EMPLOYEES = [
  { name: "Nova", role: "Developer Agent", color: "#6366F1", bg: "#6366F115", avatar: "N", task: "Build a SaaS landing page", steps: ["Reading your codebase...", "Planning component structure...", "Writing Hero.tsx...", "Writing Pricing.tsx...", "Running build checks...", "Delivering project files..."] },
  { name: "Scout", role: "Research Agent", color: "#06B6D4", bg: "#06B6D415", avatar: "S", task: "Find top 10 fintech competitors", steps: ["Scanning market landscape...", "Analyzing competitor products...", "Extracting differentiators...", "Comparing pricing models...", "Building comparison matrix...", "Delivering research report..."] },
  { name: "Aria", role: "Marketing Agent", color: "#EC4899", bg: "#EC489915", avatar: "A", task: "Write a product launch email", steps: ["Studying your brand voice...", "Researching audience pain points...", "Drafting subject lines...", "Writing email body...", "Optimizing for conversion...", "Delivering campaign assets..."] },
  { name: "Rex", role: "Sales Agent", color: "#F59E0B", bg: "#F59E0B15", avatar: "R", task: "Find leads in the SaaS space", steps: ["Scanning LinkedIn profiles...", "Filtering by ideal customer...", "Enriching contact data...", "Scoring lead quality...", "Writing personalized outreach...", "Delivering lead sheet..."] },
];

const PRICING = [
  { name: "Free", price: "$0", india: "₹0", period: "", color: "#6B7280", features: ["5 tasks / month", "Gemini Flash model", "2 AI employees", "Basic deliverables", "Community support"], cta: "Get started free", highlight: false },
  { name: "BYOK", price: "$19", india: "₹199", period: "/mo", color: "#6366F1", features: ["Unlimited tasks", "Your own API keys", "All 4 employees", "Full memory system", "Task chains & templates", "Email support"], cta: "Start with BYOK", highlight: true },
  { name: "Pro", price: "$49", india: "₹499", period: "/mo", color: "#06B6D4", features: ["1000 credits / month", "Orbium-hosted models", "All employees + tools", "Full memory system", "Priority execution", "Priority support"], cta: "Go Pro", highlight: false },
];

function TaskDemo() {
  const [empIdx, setEmpIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const emp = EMPLOYEES[empIdx];

  useEffect(() => {
    if (!running) return;
    if (stepIdx >= emp.steps.length) { setDone(true); setRunning(false); return; }
    const t = setTimeout(() => setStepIdx(s => s + 1), 650);
    return () => clearTimeout(t);
  }, [running, stepIdx, emp.steps.length]);

  const run = () => { setStepIdx(0); setDone(false); setRunning(true); };
  const reset = (idx: number) => { setEmpIdx(idx); setStepIdx(0); setDone(false); setRunning(false); };

  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: 20, overflow: "hidden", maxWidth: 500, width: "100%", fontFamily: "monospace", boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }}>
      <div style={{ background: "#0A0A0A", borderBottom: "1px solid #1A1A1A", padding: "11px 16px", display: "flex", gap: 7, alignItems: "center" }}>
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} />
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#FFBD2E" }} />
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
        <span style={{ marginLeft: 10, color: "#444", fontSize: 11 }}>orbium — workspace</span>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", background: "#0A0A0A" }}>
        {EMPLOYEES.map((e, i) => (
          <button key={i} onClick={() => reset(i)} style={{ flex: 1, padding: "10px 4px", background: "transparent", border: "none", borderBottom: empIdx === i ? `2px solid ${e.color}` : "2px solid transparent", color: empIdx === i ? e.color : "#444", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s" }}>
            {e.name}
          </button>
        ))}
      </div>
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: emp.bg, border: `1px solid ${emp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: emp.color, fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{emp.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
            <div style={{ color: "#555", fontSize: 11, marginTop: 1 }}>{emp.role}</div>
          </div>
          <div style={{ padding: "4px 12px", borderRadius: 20, background: done ? "#052e16" : running ? emp.bg : "#1A1A1A", border: `1px solid ${done ? "#16a34a40" : running ? emp.color + "40" : "#2A2A2A"}`, color: done ? "#4ade80" : running ? emp.color : "#555", fontSize: 10, fontWeight: 700 }}>
            {done ? "● DONE" : running ? "● WORKING" : "● IDLE"}
          </div>
        </div>
        <div style={{ background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ color: "#333", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 7 }}>ASSIGNED TASK</div>
          <div style={{ color: "#CCC", fontSize: 13 }}>{emp.task}</div>
        </div>
        <div style={{ minHeight: 150, marginBottom: 18, background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 12, padding: 14 }}>
          {!running && !done && <div style={{ color: "#2A2A2A", fontSize: 12, paddingTop: 44, textAlign: "center" }}>Press Run Task to watch {emp.name} work</div>}
          {(running || done) && emp.steps.slice(0, stepIdx).map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: i < stepIdx - 2 ? 0.3 : 1, transition: "opacity 0.4s" }}>
              <span style={{ color: "#16a34a", fontSize: 10, fontWeight: 900 }}>✓</span>
              <span style={{ color: i === stepIdx - 1 && !done ? emp.color : "#555", fontSize: 12, fontWeight: i === stepIdx - 1 ? 600 : 400 }}>{emp.name} is {step}</span>
            </div>
          ))}
          {done && (
            <div style={{ marginTop: 8, padding: 12, background: "#052e16", border: "1px solid #16a34a30", borderRadius: 8 }}>
              <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Task Complete ✓</div>
              <div style={{ color: "#166534", fontSize: 11 }}>Deliverables ready for download</div>
            </div>
          )}
        </div>
        <button onClick={run} disabled={running} style={{ width: "100%", padding: "12px", background: running ? "#1A1A1A" : emp.color, border: "none", borderRadius: 10, color: running ? "#333" : "#000", fontWeight: 800, fontSize: 13, cursor: running ? "not-allowed" : "pointer", fontFamily: "monospace", transition: "all 0.2s" }}>
          {running ? "Working..." : done ? "Run Again →" : "Run Task →"}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [billing, setBilling] = useState("monthly");

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .f1{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.0s both;}
        .f2{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both;}
        .f3{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both;}
        .f4{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both;}
        .f5{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both;}
        .shimmer{background:linear-gradient(90deg,#6366F1 0%,#06B6D4 30%,#fff 50%,#06B6D4 70%,#6366F1 100%);background-size:200% auto;animation:shimmer 4s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .card{transition:border-color 0.2s,transform 0.25s cubic-bezier(0.16,1,0.3,1);}
        .card:hover{border-color:#2A2A2A !important;transform:translateY(-3px);}
        .nl{color:#666;text-decoration:none;font-size:14px;font-weight:500;transition:color 0.15s;}
        .nl:hover{color:#fff;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#1A1A1A;border-radius:2px;}
      `}</style>

      <div style={{ position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:700,height:280,background:"radial-gradient(ellipse at top,#6366F10A 0%,transparent 70%)",pointerEvents:"none",zIndex:0 }} />

      {/* NAV */}
      <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,height:60,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",background:scrollY>10?"rgba(0,0,0,0.88)":"transparent",backdropFilter:scrollY>10?"blur(20px)":"none",borderBottom:scrollY>10?"1px solid #111":"none",transition:"all 0.3s" }}>
        <a href="/" style={{ display:"flex",alignItems:"center",gap:9,textDecoration:"none" }}>
          <div style={{ width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366F1,#06B6D4)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff" }}>O</div>
          <span style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.03em",color:"#fff" }}>Orbium</span>
        </a>
        <div style={{ display:"flex",gap:32 }}>
          {["Product","Employees","Pricing"].map(l=><a key={l} href={`#${l.toLowerCase()}`} className="nl">{l}</a>)}
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <a href="/login" className="nl" style={{ padding:"7px 14px",fontSize:13 }}>Sign in</a>
          <a href="/signup" style={{ textDecoration:"none" }}>
            <button style={{ background:"#fff",border:"none",borderRadius:8,padding:"8px 18px",color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.01em" }}>Start free →</button>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"100px 24px 72px",position:"relative",zIndex:1 }}>
        <div className="f1" style={{ display:"inline-flex",alignItems:"center",gap:7,background:"#111",border:"1px solid #222",borderRadius:20,padding:"5px 14px",marginBottom:32 }}>
          <span style={{ width:5,height:5,borderRadius:"50%",background:"#6366F1",display:"inline-block",animation:"pulse 2s infinite" }} />
          <span style={{ color:"#777",fontSize:12,fontWeight:500 }}>Introducing Orbium AI — orbiumai.com</span>
        </div>
        <h1 className="f2" style={{ fontSize:"clamp(52px,7.5vw,96px)",fontWeight:900,textAlign:"center",lineHeight:0.95,letterSpacing:"-0.05em",maxWidth:880 }}>
          Your business,<br/>
          <span className="shimmer">run by AI employees</span>
        </h1>
        <p className="f3" style={{ color:"#555",fontSize:"clamp(15px,1.6vw,18px)",textAlign:"center",maxWidth:460,lineHeight:1.65,marginTop:28,marginBottom:44,fontWeight:400 }}>
          Not a chatbot. A virtual office where specialized AI employees execute real tasks and deliver real work — every day.
        </p>
        <div className="f4" style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:24 }}>
          <a href="/signup" style={{ textDecoration:"none" }}>
            <button style={{ background:"#fff",border:"none",borderRadius:10,padding:"13px 28px",color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.02em" }}>Build your workspace →</button>
          </a>
          <a href="#product" style={{ textDecoration:"none" }}>
            <button style={{ background:"transparent",border:"1px solid #222",borderRadius:10,padding:"13px 28px",color:"#555",fontSize:14,cursor:"pointer",fontFamily:"inherit" }}>See how it works</button>
          </a>
        </div>
        <div className="f4" style={{ display:"flex",alignItems:"center",gap:24,marginBottom:64,flexWrap:"wrap",justifyContent:"center" }}>
          {["No credit card required","Free forever plan","2 minute setup"].map((t,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ color:"#4ade80",fontSize:11,fontWeight:700 }}>✓</span>
              <span style={{ color:"#444",fontSize:12,fontWeight:500 }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="f5" style={{ width:"100%",display:"flex",justifyContent:"center" }}>
          <TaskDemo />
        </div>
      </section>

      <div style={{ borderTop:"1px solid #111",margin:"0 32px" }} />

      {/* HOW IT WORKS */}
      <section id="product" style={{ padding:"96px 24px" }}>
        <div style={{ maxWidth:960,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:56 }}>
            <p style={{ color:"#6366F1",fontSize:11,fontWeight:700,letterSpacing:"0.12em",marginBottom:14,textTransform:"uppercase" }}>How it works</p>
            <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95 }}>Three steps to your<br/>AI workforce</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16 }}>
            {[
              {n:"01",title:"Build your workspace",desc:"Set up your virtual office in minutes. Tell Orbium about your business — it becomes permanent memory for your entire team.",color:"#6366F1"},
              {n:"02",title:"Hire your employees",desc:"Choose from Nova, Scout, Aria and Rex — or build your own. Each employee is a deep specialist in their domain.",color:"#06B6D4"},
              {n:"03",title:"Assign real work",desc:"Give tasks like you'd give a real team member. Watch them work live, download real deliverables when done.",color:"#EC4899"},
            ].map((s,i)=>(
              <div key={i} className="card" style={{ background:"#0A0A0A",borderRadius:16,padding:32,border:"1px solid #1A1A1A" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
                  <span style={{ fontFamily:"monospace",color:s.color,fontSize:11,fontWeight:800,opacity:0.6 }}>{s.n}</span>
                  <div style={{ flex:1,height:1,background:`linear-gradient(90deg,${s.color}40,transparent)` }} />
                </div>
                <h3 style={{ fontSize:20,fontWeight:800,marginBottom:12,letterSpacing:"-0.03em" }}>{s.title}</h3>
                <p style={{ color:"#555",fontSize:14,lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop:"1px solid #111",margin:"0 32px" }} />

      {/* EMPLOYEES */}
      <section id="employees" style={{ padding:"96px 24px" }}>
        <div style={{ maxWidth:960,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:56 }}>
            <p style={{ color:"#06B6D4",fontSize:11,fontWeight:700,letterSpacing:"0.12em",marginBottom:14,textTransform:"uppercase" }}>Your team</p>
            <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95 }}>Meet your AI employees</h2>
            <p style={{ color:"#444",marginTop:20,fontSize:16,maxWidth:400,margin:"20px auto 0",lineHeight:1.6 }}>Each one a specialist. Each one remembers your business. Gets smarter every task.</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14 }}>
            {EMPLOYEES.map((emp,i)=>(
              <div key={i} className="card" style={{ background:"#0A0A0A",borderRadius:16,padding:26,border:"1px solid #1A1A1A",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,background:`radial-gradient(circle,${emp.color}08 0%,transparent 70%)`,pointerEvents:"none" }} />
                <div style={{ width:46,height:46,borderRadius:13,background:emp.bg,border:`1px solid ${emp.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:900,color:emp.color,marginBottom:16 }}>{emp.avatar}</div>
                <h3 style={{ fontWeight:800,fontSize:17,marginBottom:3,letterSpacing:"-0.02em" }}>{emp.name}</h3>
                <p style={{ color:emp.color,fontSize:10,fontWeight:700,marginBottom:12,letterSpacing:"0.08em",textTransform:"uppercase" }}>{emp.role}</p>
                <p style={{ color:"#444",fontSize:13,lineHeight:1.6 }}>Trained on your business. Gets smarter with every task.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMORY SECTION */}
      <section style={{ padding:"0 24px 96px" }}>
        <div style={{ maxWidth:960,margin:"0 auto" }}>
          <div style={{ background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:20,padding:"52px 48px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center" }}>
            <div>
              <p style={{ color:"#6366F1",fontSize:11,fontWeight:700,letterSpacing:"0.12em",marginBottom:16,textTransform:"uppercase" }}>The difference</p>
              <h3 style={{ fontSize:"clamp(28px,3vw,42px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.0,marginBottom:20 }}>Employees that remember everything</h3>
              <p style={{ color:"#555",fontSize:15,lineHeight:1.7 }}>After 2 weeks, your AI team knows your brand, your stack, your customers — better than a new hire ever would.</p>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {[
                {layer:"Company Memory",desc:"Your business context. Injected into every task.",color:"#6366F1"},
                {layer:"Employee Memory",desc:"What each employee has learned from your work.",color:"#06B6D4"},
                {layer:"Task Memory",desc:"Previous outputs feed into new tasks automatically.",color:"#EC4899"},
              ].map((m,i)=>(
                <div key={i} style={{ background:"#111",border:"1px solid #1A1A1A",borderLeft:`3px solid ${m.color}`,borderRadius:10,padding:"14px 16px" }}>
                  <p style={{ color:"#fff",fontSize:13,fontWeight:700,marginBottom:3 }}>{m.layer}</p>
                  <p style={{ color:"#444",fontSize:12 }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={{ borderTop:"1px solid #111",margin:"0 32px" }} />

      {/* PRICING */}
      <section id="pricing" style={{ padding:"96px 24px" }}>
        <div style={{ maxWidth:960,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:48 }}>
            <p style={{ color:"#EC4899",fontSize:11,fontWeight:700,letterSpacing:"0.12em",marginBottom:14,textTransform:"uppercase" }}>Pricing</p>
            <h2 style={{ fontSize:"clamp(36px,4.5vw,60px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95 }}>Simple. Transparent.</h2>
            <p style={{ color:"#444",marginTop:16,fontSize:16 }}>Less than one freelancer hour. Saves 20+ every month.</p>
          </div>
          <div style={{ display:"flex",justifyContent:"center",marginBottom:40 }}>
            <div style={{ display:"inline-flex",background:"#0A0A0A",border:"1px solid #1A1A1A",borderRadius:10,padding:4 }}>
              {["monthly","yearly"].map(b=>(
                <button key={b} onClick={()=>setBilling(b)} style={{ padding:"8px 20px",borderRadius:7,border:"none",background:billing===b?"#fff":"transparent",color:billing===b?"#000":"#555",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s" }}>
                  {b==="yearly"?"Yearly — save 2 months":"Monthly"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16 }}>
            {PRICING.map((plan,i)=>(
              <div key={i} className="card" style={{ background:plan.highlight?"#fff":"#0A0A0A",borderRadius:16,padding:30,border:`1px solid ${plan.highlight?"#fff":"#1A1A1A"}`,position:"relative",overflow:"hidden" }}>
                {plan.highlight&&<div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#6366F1,#06B6D4)" }} />}
                {plan.highlight&&<div style={{ position:"absolute",top:20,right:20,background:"#6366F115",border:"1px solid #6366F140",borderRadius:6,padding:"3px 10px",color:"#6366F1",fontSize:10,fontWeight:800 }}>POPULAR</div>}
                <p style={{ color:plan.highlight?"#999":"#444",fontSize:11,fontWeight:700,letterSpacing:"0.1em",marginBottom:14,textTransform:"uppercase" }}>{plan.name}</p>
                <div style={{ display:"flex",alignItems:"baseline",gap:3,marginBottom:4 }}>
                  <span style={{ fontSize:52,fontWeight:900,letterSpacing:"-0.05em",color:plan.highlight?"#000":"#fff",lineHeight:1 }}>
                    {billing==="yearly"&&plan.price!=="$0"?(plan.price==="$19"?"$16":"$40"):plan.price}
                  </span>
                  <span style={{ color:plan.highlight?"#999":"#333",fontSize:14 }}>{plan.period}</span>
                </div>
                <p style={{ color:plan.highlight?"#AAA":"#333",fontSize:12,marginBottom:26 }}>{plan.india}{plan.period}</p>
                <div style={{ borderTop:`1px solid ${plan.highlight?"#E5E5E5":"#1A1A1A"}`,paddingTop:22,marginBottom:24,display:"flex",flexDirection:"column",gap:11 }}>
                  {plan.features.map((f,j)=>(
                    <div key={j} style={{ display:"flex",gap:10,alignItems:"center" }}>
                      <span style={{ color:plan.highlight?"#6366F1":"#4ade80",fontSize:11,fontWeight:900 }}>✓</span>
                      <span style={{ color:plan.highlight?"#555":"#666",fontSize:13 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="/signup" style={{ textDecoration:"none" }}>
                  <button style={{ width:"100%",padding:"13px",background:plan.highlight?"#000":"#fff",border:"none",borderRadius:10,color:plan.highlight?"#fff":"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.02em" }}>
                    {plan.cta}
                  </button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"0 24px 96px" }}>
        <div style={{ maxWidth:960,margin:"0 auto" }}>
          <div style={{ background:"#fff",borderRadius:20,padding:"72px 48px",textAlign:"center",position:"relative",overflow:"hidden" }}>
            <h2 style={{ fontSize:"clamp(40px,5vw,68px)",fontWeight:900,letterSpacing:"-0.05em",lineHeight:0.95,color:"#000",marginBottom:20 }}>
              Your AI team is<br/>
              <span style={{ background:"linear-gradient(135deg,#6366F1,#06B6D4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>waiting for work</span>
            </h2>
            <p style={{ color:"#888",fontSize:17,lineHeight:1.65,marginBottom:36 }}>Start free. No credit card. First employee ready in 2 minutes.</p>
            <a href="/signup" style={{ textDecoration:"none" }}>
              <button style={{ background:"#000",border:"none",borderRadius:12,padding:"16px 40px",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit",letterSpacing:"-0.02em" }}>
                Build your workspace free →
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #111",padding:"36px 32px" }}>
        <div style={{ maxWidth:960,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <div style={{ width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366F1,#06B6D4)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:11,color:"#fff" }}>O</div>
            <span style={{ fontWeight:800,fontSize:14,letterSpacing:"-0.03em" }}>Orbium AI</span>
          </div>
          <p style={{ color:"#222",fontSize:12 }}>© 2025 Orbium AI — orbiumai.com</p>
          <div style={{ display:"flex",gap:24 }}>
            {["Privacy","Terms","Contact"].map(l=>(
              <a key={l} href="#" style={{ color:"#333",fontSize:13,textDecoration:"none",fontWeight:500 }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}