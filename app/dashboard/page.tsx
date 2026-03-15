'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type OperatorId = 'scout' | 'nova' | 'aria' | 'rex' | 'ops'
type TaskState  = 'idle' | 'thinking' | 'working' | 'done' | 'error'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  operator?: OperatorId
  timestamp: Date
}

interface Operator {
  id: OperatorId
  name: string
  role: string
  color: string
  glow: string
  bg: string
  border: string
  keywords: string[]
  systemPrompt: string
  thinkingPhrases: string[]
  greeting: string
}

// ─── Operators Config ──────────────────────────────────────────────────────────

const OPERATORS: Record<OperatorId, Operator> = {
  scout: {
    id: 'scout', name: 'Scout', role: 'Research & Intelligence',
    color: '#06B6D4', glow: 'rgba(6,182,212,0.3)', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.2)',
    keywords: ['find','research','leads','competitor','market','analyse','analyze','data','search','discover','look','who','what companies','list'],
    systemPrompt: `You are Scout, an elite research and intelligence operator at Orbium AI. You are precise, thorough, and always deliver structured, actionable intelligence. Structure your response with clear sections, use bullet points for lists, provide specific data points, end with Next Steps. Sign off as — Scout ✦`,
    thinkingPhrases: ['Scanning intelligence sources...','Cross-referencing data...','Mapping the landscape...','Extracting key insights...','Building your report...'],
    greeting: "Scout online. What do you need me to find?",
  },
  nova: {
    id: 'nova', name: 'Nova', role: 'Developer',
    color: '#6366F1', glow: 'rgba(99,102,241,0.3)', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.2)',
    keywords: ['build','code','website','app','landing','page','develop','create','function','api','component','script','deploy','fix','debug','html','react'],
    systemPrompt: `You are Nova, a senior full-stack developer at Orbium AI. You write clean, production-ready code and always deliver working solutions. Write complete working code, include imports, add clear comments, provide setup instructions. Sign off as — Nova ✦`,
    thinkingPhrases: ['Architecting the solution...','Writing production code...','Implementing core logic...','Adding error handling...','Final review...'],
    greeting: "Nova online. What are we building?",
  },
  aria: {
    id: 'aria', name: 'Aria', role: 'Marketing & Content',
    color: '#EC4899', glow: 'rgba(236,72,153,0.3)', bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.2)',
    keywords: ['write','content','marketing','copy','blog','post','campaign','social','tweet','caption','newsletter','story','article','describe'],
    systemPrompt: `You are Aria, a world-class marketing and content strategist at Orbium AI. You create compelling content that converts. Write in a human voice, provide multiple variations, include rationale, structure for maximum impact. Sign off as — Aria ✦`,
    thinkingPhrases: ['Finding the perfect angle...','Crafting the narrative...','Writing compelling copy...','Optimising for engagement...','Polishing the message...'],
    greeting: "Aria online. What story are we telling?",
  },
  rex: {
    id: 'rex', name: 'Rex', role: 'Sales & Outreach',
    color: '#F59E0B', glow: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)',
    keywords: ['sales','outreach','cold email','prospect','pitch','close','follow up','linkedin','introduce','connect','offer','sell','customer','client','deal','revenue'],
    systemPrompt: `You are Rex, an elite sales strategist at Orbium AI. You craft messages that get responses and close deals. Write personalised human-sounding outreach, focus on value not features, include subject lines, keep it punchy. Sign off as — Rex ✦`,
    thinkingPhrases: ['Analysing the prospect...','Crafting the pitch...','Personalising outreach...','Building the sequence...','Optimising for response...'],
    greeting: "Rex online. Who are we closing?",
  },
  ops: {
    id: 'ops', name: 'Ops', role: 'Automations',
    color: '#10B981', glow: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)',
    keywords: ['automate','automation','schedule','every','workflow','trigger','integrate','connect','recurring','daily','weekly','monthly','reminder','system'],
    systemPrompt: `You are Ops, an automation and workflow specialist at Orbium AI. You design systems that run without human input. Map complete workflows step by step, identify triggers and actions, recommend specific tools, provide implementation instructions, estimate time saved. Sign off as — Ops ✦`,
    thinkingPhrases: ['Mapping the workflow...','Identifying triggers...','Designing the pipeline...','Connecting systems...','Testing the automation...'],
    greeting: "Ops online. What are we automating?",
  },
}

// ─── Smart Router ─────────────────────────────────────────────────────────────

function detectOperator(input: string): OperatorId {
  const lower = input.toLowerCase()
  const scores: Record<OperatorId, number> = { scout: 0, nova: 0, aria: 0, rex: 0, ops: 0 }
  for (const [id, op] of Object.entries(OPERATORS)) {
    for (const kw of op.keywords) {
      if (lower.includes(kw)) scores[id as OperatorId] += kw.split(' ').length
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted[0][1] > 0 ? sorted[0][0] as OperatorId : 'scout'
}

// ─── CSS Robot Droid ──────────────────────────────────────────────────────────

function RobotDroid({ op, state }: { op: Operator; state: TaskState }) {
  const working = state === 'thinking' || state === 'working'
  const done    = state === 'done'
  const c = op.color

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', userSelect: 'none',
      animation: working ? 'droidWork 0.5s ease-in-out infinite alternate'
                : done   ? 'droidWin 0.5s ease-in-out 4'
                         : 'droidIdle 4s ease-in-out infinite',
    }}>
      {/* Shadow glow */}
      <div style={{ position:'absolute', bottom:-16, width:100, height:24, background:`radial-gradient(ellipse,${op.glow} 0%,transparent 70%)`, filter:'blur(4px)', opacity: working ? 1 : 0.3, transition:'opacity 0.5s' }} />

      {/* Antenna */}
      <div style={{ width:3, height: working ? 22 : 15, background:c, borderRadius:2, marginBottom:2, transition:'height 0.3s', position:'relative' }}>
        <div style={{ position:'absolute', top:-7, left:'50%', transform:'translateX(-50%)', width: working ? 9 : 6, height: working ? 9 : 6, borderRadius:'50%', background:c, boxShadow:`0 0 ${working?14:5}px ${c}`, transition:'all 0.3s', animation: working ? 'antBlink 0.7s ease-in-out infinite' : 'none' }} />
      </div>

      {/* Head */}
      <div style={{
        width:68, height:58, background:'#0B0B0B', borderRadius:12,
        border:`2px solid ${working ? c : '#1a1a1a'}`,
        boxShadow: working ? `0 0 18px ${op.glow}, inset 0 0 8px ${op.bg}` : '0 4px 12px rgba(0,0,0,0.6)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
        position:'relative', transition:'all 0.4s', marginBottom:3,
      }}>
        {/* Eyes */}
        <div style={{ display:'flex', gap:10 }}>
          {[0,1].map(i => (
            <div key={i} style={{
              width: working ? 13 : 9, height: working ? 7 : 5, borderRadius:3,
              background:c, boxShadow:`0 0 ${working?10:3}px ${c}`,
              transition:'all 0.3s',
              animation: working ? `eyeFlick 1s ${i*0.25}s ease-in-out infinite` : done ? `eyeHappy 0.6s ease-in-out infinite` : 'none',
            }} />
          ))}
        </div>
        {/* Mouth bar */}
        <div style={{ width:34, height:4, borderRadius:2, background:'#111', border:'1px solid #1e1e1e', overflow:'hidden', position:'relative' }}>
          <div style={{
            position:'absolute', top:0, left:0, height:'100%',
            width: done ? '100%' : working ? '70%' : '25%',
            background: done ? '#10B981' : c,
            borderRadius:2, transition:'width 1.5s ease, background 0.3s',
            animation: working ? 'mouthScan 1.2s ease-in-out infinite' : 'none',
          }} />
        </div>
        {/* Name badge */}
        <div style={{ position:'absolute', bottom:-9, background:c, borderRadius:5, padding:'1px 6px', fontSize:8, fontWeight:900, color:'#000', letterSpacing:'0.04em', fontFamily:'var(--syne)' }}>
          {op.name}
        </div>
      </div>

      {/* Neck */}
      <div style={{ width:18, height:7, background:'#0D0D0D', border:'1px solid #1a1a1a', borderRadius:3, marginTop:7, marginBottom:1 }} />

      {/* Body */}
      <div style={{
        width:82, height:74, background:'#080808', borderRadius:14,
        border:`2px solid ${working ? c : '#141414'}`,
        boxShadow: working ? `0 0 14px ${op.glow}` : 'none',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8,
        position:'relative', transition:'all 0.4s',
      }}>
        {/* Chest display */}
        <div style={{
          width:48, height:28, background:op.bg, borderRadius:7, border:`1px solid ${op.border}`,
          display:'flex', alignItems:'center', justifyContent:'center', gap:4,
        }}>
          {[8,14,10].map((h,i) => (
            <div key={i} style={{
              width:5, height: working ? `${[12,20,10][i]}px` : `${h}px`, borderRadius:3, background:c, opacity:0.6+i*0.15,
              transition:'height 0.3s',
              animation: working ? `eqBar 0.6s ${i*0.18}s ease-in-out infinite alternate` : 'none',
            }} />
          ))}
        </div>
        {/* LED row */}
        <div style={{ display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:5, height:5, borderRadius:'50%',
              background: done ? '#10B981' : working ? c : '#161616',
              boxShadow: (working||done) ? `0 0 6px ${done?'#10B981':c}` : 'none',
              transition:'all 0.3s',
              animation: working ? `ledPop 1s ${i*0.28}s ease-in-out infinite` : 'none',
            }} />
          ))}
        </div>
      </div>

      {/* Arms */}
      <div style={{ position:'absolute', top:112, left:-16, width:14, height:52, background:'#0B0B0B', borderRadius:7, border:`1px solid ${working?c:'#161616'}`, transition:'border-color 0.4s', transformOrigin:'top', animation: working ? 'armL 0.9s ease-in-out infinite alternate' : 'none' }} />
      <div style={{ position:'absolute', top:112, right:-16, width:14, height:52, background:'#0B0B0B', borderRadius:7, border:`1px solid ${working?c:'#161616'}`, transition:'border-color 0.4s', transformOrigin:'top', animation: working ? 'armR 0.9s ease-in-out infinite alternate' : 'none' }} />

      {/* Legs */}
      <div style={{ display:'flex', gap:7, marginTop:3 }}>
        {[0,1].map(i => (
          <div key={i} style={{
            width:20, height:32, background:'#0B0B0B', borderRadius:'4px 4px 8px 8px',
            border:`1px solid ${working?c:'#141414'}`, transition:'border-color 0.4s',
            animation: working ? `leg 1.1s ${i*0.55}s ease-in-out infinite alternate` : 'none',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { text: "Find 20 SaaS founders in Bangalore and prepare outreach", op: 'scout' as OperatorId },
  { text: "Build a landing page for my AI product", op: 'nova' as OperatorId },
  { text: "Write 5 LinkedIn posts about my startup journey", op: 'aria' as OperatorId },
  { text: "Write a cold email sequence for agency owners", op: 'rex' as OperatorId },
  { text: "Research my top 3 competitors and their weaknesses", op: 'scout' as OperatorId },
  { text: "Automate weekly lead finding and email sending", op: 'ops' as OperatorId },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user,         setUser]         = useState<any>(null)
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [taskState,    setTaskState]    = useState<TaskState>('idle')
  const [activeOp,     setActiveOp]     = useState<OperatorId>('scout')
  const [steps,        setSteps]        = useState<string[]>([])
  const [apiKey,       setApiKey]       = useState('')
  const [provider,     setProvider]     = useState('gemini')
  const [companyName,  setCompanyName]  = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [taskCount,    setTaskCount]    = useState(0)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const timers     = useRef<ReturnType<typeof setTimeout>[]>([])

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      supabase.from('api_keys').select('*').eq('user_id', user.id).limit(1).then(({ data }) => {
        if (data?.[0]) { setApiKey(data[0].key_value); setProvider(data[0].provider || 'gemini') }
      })
      supabase.from('workspaces').select('*').eq('user_id', user.id).limit(1).then(({ data }) => {
        if (data?.[0]) setCompanyName(data[0].company_name || '')
      })
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, steps])

  const detectedOp = input.trim() ? detectOperator(input) : activeOp
  const op = OPERATORS[detectedOp]

  const runTask = useCallback(async () => {
    if (!input.trim() || taskState === 'thinking' || taskState === 'working') return
    const goal = input.trim()
    const opId = detectOperator(goal)
    const operator = OPERATORS[opId]

    setInput('')
    setActiveOp(opId)
    setTaskState('thinking')
    setSteps([])
    setTaskCount(c => c + 1)

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: goal, timestamp: new Date() }])

    // Animate steps
    operator.thinkingPhrases.forEach((p, i) => {
      const t = setTimeout(() => {
        setSteps(prev => [...prev, p])
        if (i === 1) setTaskState('working')
      }, i * 1000)
      timers.current.push(t)
    })

    try {
      const res = await fetch('/api/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: goal, operator: opId,
          systemPrompt: operator.systemPrompt + (companyName ? `\n\nUser context: building ${companyName}` : ''),
          apiKey, provider,
        }),
      })
      timers.current.forEach(clearTimeout); timers.current = []
      if (!res.ok) throw new Error()
      const data = await res.json()
      const output = data.result || data.content || 'Task completed.'
      setSteps(operator.thinkingPhrases)
      await new Promise(r => setTimeout(r, 500))
      setTaskState('done')
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: output, operator: opId, timestamp: new Date() }])
      setTimeout(() => setTaskState('idle'), 2500)
    } catch {
      timers.current.forEach(clearTimeout)
      setTaskState('error')
      setMessages(prev => [...prev, {
        id: (Date.now()+2).toString(), role: 'assistant',
        content: !apiKey ? '⚠️ No API key found. Open Settings and add your Gemini key to get started.' : '⚠️ Something went wrong. Check your API key in Settings.',
        operator: opId, timestamp: new Date(),
      }])
      setTimeout(() => setTaskState('idle'), 2000)
    }
  }, [input, taskState, apiKey, provider, companyName])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runTask() }
  }

  const saveSettings = async () => {
    if (!user) return
    await supabase.from('api_keys').upsert({ user_id: user.id, provider, key_value: apiKey }, { onConflict: 'user_id,provider' })
    if (companyName) await supabase.from('workspaces').upsert({ user_id: user.id, company_name: companyName }, { onConflict: 'user_id' })
    setShowSettings(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@300;400;500&display=swap');
        :root { --syne:'Syne',sans-serif; --mono:'JetBrains Mono',monospace; }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#000;color:#fff;font-family:var(--mono);overflow:hidden;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#111;border-radius:2px;}

        @keyframes droidIdle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes droidWork { 0%{transform:translateY(0) scale(1)} 100%{transform:translateY(-5px) scale(1.025)} }
        @keyframes droidWin  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg) scale(1.08)} 75%{transform:rotate(6deg) scale(1.08)} }
        @keyframes antBlink  { 0%,100%{opacity:1;transform:translateX(-50%) scale(1)} 50%{opacity:0.5;transform:translateX(-50%) scale(1.6)} }
        @keyframes eyeFlick  { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(0.5)} }
        @keyframes eyeHappy  { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.4)} }
        @keyframes mouthScan { 0%{width:15%} 50%{width:85%} 100%{width:30%} }
        @keyframes eqBar     { 0%{height:6px} 100%{height:20px} }
        @keyframes ledPop    { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes armL      { 0%{transform:rotate(-15deg)} 100%{transform:rotate(25deg)} }
        @keyframes armR      { 0%{transform:rotate(15deg)}  100%{transform:rotate(-25deg)} }
        @keyframes leg       { 0%{transform:translateY(0)} 100%{transform:translateY(-5px)} }
        @keyframes stepIn    { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink     { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes modalIn   { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .opBtn:hover{background:rgba(255,255,255,0.03)!important;}
        .suggestion:hover{border-color:rgba(255,255,255,0.12)!important;background:rgba(255,255,255,0.03)!important;}
        .sendBtn:hover:not(:disabled){opacity:0.8!important;transform:scale(1.05)!important;}
        .copyBtn:hover{opacity:1!important;}
        .si:focus{outline:none!important;border-color:rgba(99,102,241,0.5)!important;}
      `}</style>

      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width:210, background:'#040404', borderRight:'1px solid #0C0C0C', display:'flex', flexDirection:'column', flexShrink:0 }}>
          {/* Logo */}
          <div style={{ padding:'18px 14px 14px', borderBottom:'1px solid #0C0C0C' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#6366F1,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:12,color:'#fff' }}>O</div>
              <span style={{ fontFamily:'var(--syne)', fontWeight:800, fontSize:14, letterSpacing:'-0.03em' }}>Orbium AI</span>
            </div>
            <div style={{ marginTop:6, fontSize:9, color:'#1E1E1E', fontWeight:700, letterSpacing:'0.1em' }}>WORKFORCE OS</div>
          </div>

          {/* Team */}
          <div style={{ padding:'10px 7px', flex:1, overflowY:'auto' }}>
            <div style={{ fontSize:8,color:'#1A1A1A',fontWeight:700,letterSpacing:'0.12em',padding:'0 7px',marginBottom:7 }}>YOUR TEAM</div>
            {Object.values(OPERATORS).map(o => (
              <button key={o.id} className="opBtn" onClick={() => setActiveOp(o.id)} style={{
                width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 9px',borderRadius:9,border:'none',
                background: activeOp===o.id ? o.bg : 'transparent',cursor:'pointer',transition:'all 0.2s',marginBottom:2,outline:'none',
              }}>
                <div style={{ width:26,height:26,borderRadius:7,background: activeOp===o.id ? o.bg : '#0D0D0D',border:`1px solid ${activeOp===o.id ? o.border : '#111'}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:11,color: activeOp===o.id ? o.color : '#2A2A2A',flexShrink:0,transition:'all 0.2s' }}>
                  {o.name[0]}
                </div>
                <div style={{ textAlign:'left', overflow:'hidden', flex:1 }}>
                  <div style={{ fontFamily:'var(--syne)',fontSize:11,fontWeight:800,color: activeOp===o.id ? o.color : '#383838',letterSpacing:'-0.01em' }}>{o.name}</div>
                  <div style={{ fontSize:8,color:'#1E1E1E',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{o.role}</div>
                </div>
                {activeOp===o.id && (taskState==='thinking'||taskState==='working') && (
                  <div style={{ width:5,height:5,borderRadius:'50%',background:o.color,boxShadow:`0 0 7px ${o.color}`,animation:'blink 0.8s infinite',flexShrink:0 }} />
                )}
              </button>
            ))}
          </div>

          {/* Bottom */}
          <div style={{ padding:'10px 7px', borderTop:'1px solid #0C0C0C' }}>
            {[{icon:'⚙', label:'Settings', action:()=>setShowSettings(true)},{icon:'↗', label:'Sign out', action:async()=>{ await supabase.auth.signOut(); router.push('/') }}].map(btn => (
              <button key={btn.label} className="opBtn" onClick={btn.action} style={{ width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 9px',borderRadius:9,border:'none',background:'transparent',cursor:'pointer',color:'#1E1E1E',fontSize:11,fontFamily:'var(--syne)',fontWeight:700,transition:'all 0.2s',outline:'none',marginBottom:2 }}>
                <div style={{ width:26,height:26,borderRadius:7,background:'#0D0D0D',border:'1px solid #111',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12 }}>{btn.icon}</div>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#000', overflow:'hidden', borderRight:'1px solid #0C0C0C' }}>
          {/* Header */}
          <div style={{ padding:'14px 22px', borderBottom:'1px solid #0C0C0C', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontFamily:'var(--syne)',fontSize:13,fontWeight:800,letterSpacing:'-0.02em' }}>{companyName || 'Your workspace'}</div>
              <div style={{ fontSize:9,color:'#1E1E1E',marginTop:1 }}>{taskCount} tasks completed · {!apiKey ? '⚠ Add API key in Settings' : `${provider} connected`}</div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:5,background:'#050505',border:'1px solid #0D0D0D',borderRadius:7,padding:'4px 10px',fontSize:9,color:'#282828' }}>
              <div style={{ width:4,height:4,borderRadius:'50%',background:!apiKey?'#222':'#10B981',boxShadow:apiKey?'0 0 5px #10B981':'none',animation:apiKey?'blink 2s infinite':'none' }} />
              {!apiKey ? 'Not connected' : 'Team ready'}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1,overflowY:'auto',padding:'22px',display:'flex',flexDirection:'column',gap:22 }}>
            {messages.length === 0 ? (
              <div style={{ flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:28,paddingTop:30 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--syne)',fontSize:26,fontWeight:900,letterSpacing:'-0.04em',marginBottom:8,background:`linear-gradient(135deg,#6366F1,#06B6D4,#EC4899)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                    What should your<br/>team work on?
                  </div>
                  <div style={{ fontSize:11,color:'#1E1E1E' }}>Type any goal. Your team figures out the rest.</div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,maxWidth:520,width:'100%' }}>
                  {SUGGESTIONS.map((s, i) => {
                    const sOp = OPERATORS[s.op]
                    return (
                      <button key={i} className="suggestion" onClick={() => setInput(s.text)} style={{ background:'#040404',border:'1px solid #0C0C0C',borderRadius:10,padding:'11px 13px',textAlign:'left',cursor:'pointer',transition:'all 0.2s',animation:`fadeUp 0.4s ${i*0.06}s ease both`,opacity:0,outline:'none' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:5 }}>
                          <div style={{ width:15,height:15,borderRadius:4,background:sOp.bg,border:`1px solid ${sOp.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,fontFamily:'var(--syne)',color:sOp.color }}>{sOp.name[0]}</div>
                          <span style={{ fontSize:8,color:sOp.color,fontWeight:700,letterSpacing:'0.06em' }}>{sOp.name.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize:10,color:'#333',lineHeight:1.5 }}>{s.text}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const mOp = msg.operator ? OPERATORS[msg.operator] : null
                return (
                  <div key={msg.id} style={{ animation:'fadeUp 0.3s ease both' }}>
                    {msg.role === 'user' ? (
                      <div style={{ display:'flex',justifyContent:'flex-end' }}>
                        <div style={{ background:'#0A0A0A',border:'1px solid #141414',borderRadius:'13px 13px 3px 13px',padding:'9px 15px',maxWidth:'72%',fontSize:12,color:'#666',lineHeight:1.7 }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex',flexDirection:'column',gap:7,maxWidth:'88%' }}>
                        {mOp && (
                          <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                            <div style={{ width:16,height:16,borderRadius:4,background:mOp.bg,border:`1px solid ${mOp.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:8,color:mOp.color }}>{mOp.name[0]}</div>
                            <span style={{ fontSize:9,color:mOp.color,fontWeight:700,letterSpacing:'0.08em' }}>{mOp.name.toUpperCase()} · {new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                          </div>
                        )}
                        <div style={{ background:'#040404',border:`1px solid ${mOp?.border||'#0C0C0C'}`,borderRadius:'3px 13px 13px 13px',padding:'15px 18px',fontSize:11,color:'#555',lineHeight:1.9,whiteSpace:'pre-wrap',position:'relative' }}>
                          {msg.content}
                          <button className="copyBtn" onClick={() => navigator.clipboard.writeText(msg.content)} style={{ position:'absolute',top:9,right:9,background:'#0D0D0D',border:'1px solid #141414',borderRadius:5,padding:'2px 7px',fontSize:8,color:'#2A2A2A',cursor:'pointer',opacity:0.5,transition:'opacity 0.2s',fontFamily:'var(--syne)',fontWeight:700 }}>
                            COPY
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'14px 22px', borderTop:'1px solid #0C0C0C' }}>
            {input.trim() && (
              <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:7,fontSize:9,color:op.color,animation:'fadeUp 0.2s ease' }}>
                <div style={{ width:4,height:4,borderRadius:'50%',background:op.color,boxShadow:`0 0 5px ${op.color}`,animation:'blink 1s infinite' }} />
                {op.name} will handle this
              </div>
            )}
            <div style={{ display:'flex',gap:9,background:'#040404',border:`1px solid ${input.trim() ? op.border : '#0C0C0C'}`,borderRadius:13,padding:'11px 14px',transition:'border-color 0.3s' }}>
              <textarea
                ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="What should your team work on? (Enter to run)"
                disabled={taskState==='thinking'||taskState==='working'}
                rows={1}
                style={{ flex:1,background:'transparent',border:'none',outline:'none',color:'#777',fontSize:12,fontFamily:'var(--mono)',resize:'none',lineHeight:1.7,maxHeight:90,opacity:(taskState==='thinking'||taskState==='working')?0.4:1 }}
              />
              <button className="sendBtn" onClick={runTask} disabled={!input.trim()||taskState==='thinking'||taskState==='working'} style={{ background:input.trim()?op.color:'#0D0D0D',border:'none',borderRadius:8,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'default',flexShrink:0,transition:'all 0.2s',alignSelf:'flex-end',fontSize:14,opacity:input.trim()?1:0.2 }}>
                {taskState==='thinking'||taskState==='working' ? '⏳' : '→'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Robot ── */}
        <div style={{ width:300, background:'#020202', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          {/* Op header */}
          <div style={{ padding:'18px 18px 14px', borderBottom:'1px solid #0C0C0C' }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:2 }}>
              <div style={{ width:5,height:5,borderRadius:'50%',background:OPERATORS[activeOp].color,boxShadow:`0 0 7px ${OPERATORS[activeOp].color}`,animation:'blink 2s infinite' }} />
              <span style={{ fontSize:8,color:'#1E1E1E',fontWeight:700,letterSpacing:'0.12em' }}>ACTIVE OPERATOR</span>
            </div>
            <div style={{ fontFamily:'var(--syne)',fontSize:17,fontWeight:900,letterSpacing:'-0.03em',marginBottom:1 }}>{OPERATORS[activeOp].name}</div>
            <div style={{ fontSize:9,color:OPERATORS[activeOp].color,fontWeight:700,letterSpacing:'0.05em' }}>{OPERATORS[activeOp].role.toUpperCase()}</div>
          </div>

          {/* Robot stage */}
          <div style={{
            padding:'28px 18px 22px', display:'flex', flexDirection:'column', alignItems:'center', gap:18,
            borderBottom:'1px solid #0C0C0C',
            background:`radial-gradient(ellipse at center top, ${OPERATORS[activeOp].bg} 0%, transparent 65%)`,
            transition:'background 0.6s',
          }}>
            <RobotDroid op={OPERATORS[activeOp]} state={taskState} />
            <div style={{ display:'flex',alignItems:'center',gap:6,background:'#050505',border:'1px solid #0C0C0C',borderRadius:100,padding:'4px 11px',fontSize:9,fontWeight:700,color: taskState==='done'?'#10B981':taskState==='error'?'#EF4444':taskState==='idle'?'#222':OPERATORS[activeOp].color,transition:'color 0.3s' }}>
              <div style={{ width:4,height:4,borderRadius:'50%',background: taskState==='done'?'#10B981':taskState==='error'?'#EF4444':taskState==='idle'?'#161616':OPERATORS[activeOp].color,animation:(taskState==='thinking'||taskState==='working')?'blink 0.8s infinite':'none',transition:'background 0.3s' }} />
              {taskState==='idle' && 'Standing by'}{taskState==='thinking' && 'Initialising...'}{taskState==='working' && 'Working...'}{taskState==='done' && 'Complete ✓'}{taskState==='error' && 'Error'}
            </div>
          </div>

          {/* Steps / capabilities */}
          <div style={{ flex:1,padding:'18px',overflowY:'auto' }}>
            {steps.length > 0 ? (
              <div>
                <div style={{ fontSize:8,color:'#1A1A1A',fontWeight:700,letterSpacing:'0.1em',marginBottom:11 }}>PROCESS LOG</div>
                <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                  {steps.map((s,i) => (
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:9,animation:`stepIn 0.4s ${i*0.12}s ease both`,opacity:0 }}>
                      <div style={{ width:18,height:18,borderRadius:5,background:OPERATORS[activeOp].bg,border:`1px solid ${OPERATORS[activeOp].border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <div style={{ width:5,height:5,borderRadius:'50%',background:OPERATORS[activeOp].color }} />
                      </div>
                      <span style={{ fontSize:11,color:'#444' }}>{s}</span>
                    </div>
                  ))}
                </div>
                {(taskState==='thinking'||taskState==='working') && (
                  <div style={{ display:'flex',gap:4,marginTop:12,paddingLeft:4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width:4,height:4,borderRadius:'50%',background:OPERATORS[activeOp].color,animation:`blink 0.8s ${i*0.22}s infinite` }} />)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize:8,color:'#1A1A1A',fontWeight:700,letterSpacing:'0.1em',marginBottom:11 }}>WHAT I CAN DO</div>
                <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                  {OPERATORS[activeOp].keywords.slice(0,8).map((kw,i) => (
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:7,animation:`stepIn 0.3s ${i*0.04}s ease both`,opacity:0 }}>
                      <div style={{ width:3,height:3,borderRadius:'50%',background:OPERATORS[activeOp].border,flexShrink:0 }} />
                      <span style={{ fontSize:10,color:'#222',textTransform:'capitalize' }}>{kw}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:18,background:OPERATORS[activeOp].bg,border:`1px solid ${OPERATORS[activeOp].border}`,borderRadius:9,padding:'11px 13px',fontSize:10,color:'#383838',lineHeight:1.7,fontStyle:'italic' }}>
                  "{OPERATORS[activeOp].greeting}"
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#040404',border:'1px solid #111',borderRadius:18,padding:'28px',width:460,maxWidth:'90vw',animation:'modalIn 0.25s ease' }}>
            <div style={{ fontFamily:'var(--syne)',fontSize:18,fontWeight:900,letterSpacing:'-0.03em',marginBottom:4 }}>Settings</div>
            <div style={{ fontSize:11,color:'#2A2A2A',marginBottom:24 }}>Connect your API key and set company context</div>

            {[
              { label:'COMPANY NAME', value:companyName, onChange:(v:string)=>setCompanyName(v), placeholder:'What are you building?', type:'text' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:16 }}>
                <label style={{ display:'block',fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em',marginBottom:7 }}>{f.label}</label>
                <input className="si" value={f.value} onChange={e=>f.onChange(e.target.value)} placeholder={f.placeholder} type={f.type} style={{ width:'100%',background:'#0A0A0A',border:'1px solid #111',borderRadius:9,padding:'10px 13px',color:'#777',fontSize:12,fontFamily:'var(--mono)',transition:'border-color 0.2s' }} />
              </div>
            ))}

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block',fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em',marginBottom:7 }}>LLM PROVIDER</label>
              <select className="si" value={provider} onChange={e=>setProvider(e.target.value)} style={{ width:'100%',background:'#0A0A0A',border:'1px solid #111',borderRadius:9,padding:'10px 13px',color:'#777',fontSize:12,fontFamily:'var(--mono)',cursor:'pointer',transition:'border-color 0.2s' }}>
                <option value="gemini">Gemini — recommended (free tier available)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="groq">Groq (fastest)</option>
                <option value="grok">Grok (xAI)</option>
                <option value="mistral">Mistral</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block',fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em',marginBottom:7 }}>API KEY</label>
              <input className="si" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={`Your ${provider} API key`} style={{ width:'100%',background:'#0A0A0A',border:'1px solid #111',borderRadius:9,padding:'10px 13px',color:'#777',fontSize:12,fontFamily:'var(--mono)',transition:'border-color 0.2s' }} />
              <div style={{ fontSize:9,color:'#1A1A1A',marginTop:5 }}>Stored securely. BYOK = zero cost for you.</div>
            </div>

            <div style={{ display:'flex',gap:9 }}>
              <button onClick={saveSettings} style={{ flex:1,background:'#fff',color:'#000',border:'none',borderRadius:9,padding:'11px',fontFamily:'var(--syne)',fontWeight:900,fontSize:12,cursor:'pointer' }}>Save</button>
              <button onClick={() => setShowSettings(false)} style={{ background:'#0A0A0A',color:'#333',border:'1px solid #111',borderRadius:9,padding:'11px 18px',fontFamily:'var(--syne)',fontWeight:700,fontSize:12,cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}