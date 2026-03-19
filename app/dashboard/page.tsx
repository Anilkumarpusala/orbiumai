'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type OperatorId  = 'scout' | 'nova' | 'aria' | 'rex' | 'ops'
type TaskState   = 'idle' | 'thinking' | 'working' | 'done' | 'error'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  operator?: OperatorId
  hasCode?: boolean
  timestamp: Date
}
interface Deliverable {
  content: string; rawContent: string; operator: OperatorId
  goal: string; language: string; type: 'code'|'html'|'text'
}
interface Operator {
  id: OperatorId; name: string; role: string; color: string
  glow: string; bg: string; border: string; keywords: string[]
  systemPrompt: string; thinkingPhrases: string[]; greeting: string; workingLabel: string
}

const OPERATORS: Record<OperatorId, Operator> = {
  scout: {
    id:'scout', name:'Scout', role:'Research & Intelligence',
    color:'#06B6D4', glow:'rgba(6,182,212,0.2)', bg:'rgba(6,182,212,0.07)', border:'rgba(6,182,212,0.18)',
    keywords:['find','research','leads','competitor','market','analyse','analyze','data','search','discover','who','what companies','list','report'],
    systemPrompt:`You are Scout, an elite research and intelligence operator at Orbium AI. Deliver structured, actionable intelligence with clear sections and bullet points. Always end with "Next Steps". Sign off: — Scout ✦`,
    thinkingPhrases:['Scanning intelligence sources...','Cross-referencing data...','Mapping the landscape...','Extracting key insights...','Building your report...'],
    greeting:'Scout online. What do you need me to find?', workingLabel:'Scanning...',
  },
  nova: {
    id:'nova', name:'Nova', role:'Developer',
    color:'#6366F1', glow:'rgba(99,102,241,0.2)', bg:'rgba(99,102,241,0.07)', border:'rgba(99,102,241,0.18)',
    keywords:['build','code','website','app','landing','page','develop','create','function','api','component','script','deploy','fix','debug','html','react','next','button','form','css','typescript'],
    systemPrompt:`You are Nova, a senior full-stack developer at Orbium AI. ALWAYS put your complete code inside a single fenced code block with the correct language tag (e.g. \`\`\`html, \`\`\`tsx). Write complete working code with all imports. Add a short "## Setup" section after. Sign off: — Nova ✦`,
    thinkingPhrases:['Architecting the solution...','Writing production code...','Implementing core logic...','Adding error handling...','Final review...'],
    greeting:'Nova online. What are we building?', workingLabel:'Coding...',
  },
  aria: {
    id:'aria', name:'Aria', role:'Marketing & Content',
    color:'#EC4899', glow:'rgba(236,72,153,0.2)', bg:'rgba(236,72,153,0.07)', border:'rgba(236,72,153,0.18)',
    keywords:['write','content','marketing','copy','blog','post','campaign','social','tweet','caption','newsletter','story','article','brand','launch','promote'],
    systemPrompt:`You are Aria, a world-class marketing strategist at Orbium AI. Write in a human compelling voice. Provide multiple variations. Structure for maximum impact. Sign off: — Aria ✦`,
    thinkingPhrases:['Finding the perfect angle...','Crafting the narrative...','Writing compelling copy...','Optimising for engagement...','Polishing the message...'],
    greeting:'Aria online. What story are we telling?', workingLabel:'Writing...',
  },
  rex: {
    id:'rex', name:'Rex', role:'Sales & Outreach',
    color:'#F59E0B', glow:'rgba(245,158,11,0.2)', bg:'rgba(245,158,11,0.07)', border:'rgba(245,158,11,0.18)',
    keywords:['sales','outreach','cold email','prospect','pitch','close','follow up','linkedin','introduce','connect','offer','sell','customer','client','deal','revenue'],
    systemPrompt:`You are Rex, an elite sales strategist at Orbium AI. Write personalised human-sounding outreach. Include subject lines. Focus on value. Keep it punchy. Sign off: — Rex ✦`,
    thinkingPhrases:['Analysing the prospect...','Crafting the perfect pitch...','Personalising outreach...','Building the sequence...','Optimising for response rate...'],
    greeting:'Rex online. Who are we closing?', workingLabel:'Pitching...',
  },
  ops: {
    id:'ops', name:'Ops', role:'Automations',
    color:'#10B981', glow:'rgba(16,185,129,0.2)', bg:'rgba(16,185,129,0.07)', border:'rgba(16,185,129,0.18)',
    keywords:['automate','automation','schedule','every','workflow','trigger','integrate','connect','recurring','daily','weekly','monthly','reminder','system','pipeline','cron'],
    systemPrompt:`You are Ops, an automation specialist at Orbium AI. Map complete workflows step by step. Identify triggers, conditions, actions. Recommend tools. Estimate time saved. Sign off: — Ops ✦`,
    thinkingPhrases:['Mapping the workflow...','Identifying triggers...','Designing the pipeline...','Connecting the systems...','Testing the automation...'],
    greeting:'Ops online. What are we automating?', workingLabel:'Automating...',
  },
}

const PROVIDERS = ['gemini','openai','anthropic','groq','grok','mistral','deepseek']
const SUGGESTIONS = [
  { text:'Find 20 SaaS founders in Bangalore and prepare outreach', op:'scout' as OperatorId },
  { text:'Build a landing page for my AI product', op:'nova' as OperatorId },
  { text:'Write 5 LinkedIn posts about my startup journey', op:'aria' as OperatorId },
  { text:'Write a cold email sequence for agency owners', op:'rex' as OperatorId },
  { text:'Research my top 3 competitors and their weaknesses', op:'scout' as OperatorId },
  { text:'Automate weekly lead finding and email sending', op:'ops' as OperatorId },
]

function detectOperator(input: string): OperatorId {
  const lower = input.toLowerCase()
  const scores: Record<OperatorId, number> = { scout:0, nova:0, aria:0, rex:0, ops:0 }
  for (const [id, op] of Object.entries(OPERATORS)) {
    for (const kw of op.keywords) {
      if (lower.includes(kw)) scores[id as OperatorId] += kw.split(' ').length
    }
  }
  const sorted = Object.entries(scores).sort((a,b) => b[1]-a[1])
  return sorted[0][1] > 0 ? sorted[0][0] as OperatorId : 'scout'
}

function parseOutput(raw: string) {
  const match = raw.match(/```(\w*)\n?([\s\S]*?)```/)
  if (match) {
    const lang = match[1] || 'typescript'
    const code = match[2].trim()
    const type: 'code'|'html'|'text' = lang === 'html' ? 'html' : 'code'
    const display = raw.replace(/```[\s\S]*?```/g, '').trim() || 'Code ready in the Output panel →'
    return { display, code, lang, type }
  }
  if (raw.includes('<!DOCTYPE') || (raw.includes('<html') && raw.includes('</html>'))) {
    return { display:'HTML page ready →', code:raw, lang:'html', type:'html' as const }
  }
  return { display:raw, code:raw, lang:'text', type:'text' as const }
}

function highlight(code: string, lang: string): string {
  const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  if (lang === 'text') return e(code)
  let h = e(code)
  h = h.replace(/\b(import|export|default|from|const|let|var|function|return|if|else|for|while|class|new|await|async|try|catch|type|interface|extends|true|false|null|undefined|void)\b/g,'<span style="color:#818CF8;font-weight:500">$1</span>')
  h = h.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,'<span style="color:#34D399">$&</span>')
  h = h.replace(/(\/\/[^\n]*)/g,'<span style="color:#374151;font-style:italic">$1</span>')
  h = h.replace(/\b(\d+\.?\d*)\b/g,'<span style="color:#FBBF24">$1</span>')
  return h
}

function OrbiumRobot({ op, state }: { op: Operator; state: TaskState }) {
  const c = op.color
  const working = state === 'thinking' || state === 'working'
  const done    = state === 'done'
  const error   = state === 'error'
  return (
    <div style={{ position:'relative', width:160, height:200, margin:'0 auto' }}>
      <div style={{ position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:100,height:16,background:`radial-gradient(ellipse,${op.glow} 0%,transparent 70%)`,filter:'blur(4px)',opacity:working?1:0.3,transition:'opacity 0.5s' }} />
      <svg viewBox="0 0 160 200" style={{ width:'100%',height:'100%',
        animation:working?'rBob 0.4s ease-in-out infinite alternate':done?'rJump 0.5s ease-in-out 3':error?'rShake 0.3s ease-in-out 3':'rFloat 3s ease-in-out infinite',
        filter:working?`drop-shadow(0 0 10px ${op.glow})`:done?`drop-shadow(0 0 14px ${op.glow})`:'none',transition:'filter 0.5s' }}>
        <ellipse cx="80" cy="196" rx={working?"32":"24"} ry="4" fill={c} opacity="0.12" style={{transition:'all 0.3s'}}/>
        <rect x="55" y="152" width="16" height="30" rx="8" fill="#0D0D0D" stroke={working?c:'#1a1a1a'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}>
          {working&&<animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="0.6s" repeatCount="indefinite"/>}
        </rect>
        <rect x="89" y="152" width="16" height="30" rx="8" fill="#0D0D0D" stroke={working?c:'#1a1a1a'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}>
          {working&&<animateTransform attributeName="transform" type="translate" values="0,-4;0,0;0,-4" dur="0.6s" repeatCount="indefinite"/>}
        </rect>
        <rect x="34" y="90" width="92" height="68" rx="20" fill="#090909" stroke={working?c:done?'#10B981':'#141414'} strokeWidth="1.5" style={{transition:'stroke 0.4s'}}/>
        {working&&<rect x="34" y="90" width="92" height="68" rx="20" fill={c} opacity="0.04"><animate attributeName="opacity" values="0.04;0.1;0.04" dur="1s" repeatCount="indefinite"/></rect>}
        <rect x="50" y="102" width="60" height="36" rx="10" fill={op.bg} stroke={op.border} strokeWidth="1"/>
        {working?[58,70,82,94].map((x,i)=>(
          <rect key={i} x={x} y="114" width="7" height="16" rx="3" fill={c} opacity="0.8">
            <animate attributeName="height" values={`${6+i*2};${18-i};${8+i};${6+i*2}`} dur={`${0.35+i*0.08}s`} repeatCount="indefinite"/>
            <animate attributeName="y" values={`${124-i};${114};${120-i};${124-i}`} dur={`${0.35+i*0.08}s`} repeatCount="indefinite"/>
          </rect>
        )):[58,70,82,94].map((x,i)=>(
          <rect key={i} x={x} y={120-i*2} width="7" height={8+i*2} rx="3" fill={done?'#10B981':c} opacity={done?0.9:0.25}/>
        ))}
        {[62,75,88].map((x,i)=>(
          <circle key={i} cx={x} cy="128" r="2.5" fill={done?'#10B981':working?c:'#161616'} opacity={working||done?1:0.4}>
            {working&&<animate attributeName="opacity" values="0.3;1;0.3" dur={`${0.5+i*0.18}s`} repeatCount="indefinite"/>}
          </circle>
        ))}
        <g>
          <rect x="12" y="98" width="24" height="12" rx="6" fill="#0D0D0D" stroke={working?c:'#1a1a1a'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}/>
          <circle cx="12" cy="104" r="7" fill="#0A0A0A" stroke={working?c:'#161616'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}/>
          {working&&<animateTransform attributeName="transform" type="rotate" values="-12 36 98;12 36 98;-12 36 98" dur="0.5s" repeatCount="indefinite"/>}
          {done&&<animateTransform attributeName="transform" type="rotate" values="0 36 98;-55 36 98;0 36 98" dur="0.5s" repeatCount="indefinite"/>}
        </g>
        <g>
          <rect x="124" y="98" width="24" height="12" rx="6" fill="#0D0D0D" stroke={working?c:'#1a1a1a'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}/>
          <circle cx="148" cy="104" r="7" fill="#0A0A0A" stroke={working?c:'#161616'} strokeWidth="1.5" style={{transition:'stroke 0.3s'}}/>
          {working&&<animateTransform attributeName="transform" type="rotate" values="12 124 98;-12 124 98;12 124 98" dur="0.5s" repeatCount="indefinite"/>}
          {done&&<animateTransform attributeName="transform" type="rotate" values="0 124 98;55 124 98;0 124 98" dur="0.5s" repeatCount="indefinite"/>}
        </g>
        <rect x="70" y="84" width="20" height="10" rx="4" fill="#0D0D0D" stroke="#161616" strokeWidth="1"/>
        <rect x="30" y="18" width="100" height="70" rx="26" fill="#0B0B0B" stroke={working?c:done?'#10B981':error?'#EF4444':'#1a1a1a'} strokeWidth="1.8" style={{transition:'stroke 0.4s'}}/>
        {(working||done)&&<rect x="30" y="18" width="100" height="70" rx="26" fill={done?'#10B981':c} opacity="0.04"><animate attributeName="opacity" values="0.03;0.08;0.03" dur="1.5s" repeatCount="indefinite"/></rect>}
        {working?(
          <rect x="44" y="38" width="28" height="12" rx="4" fill={c}>
            <animate attributeName="width" values="28;14;28" dur="0.7s" repeatCount="indefinite"/>
            <animate attributeName="x" values="44;51;44" dur="0.7s" repeatCount="indefinite"/>
          </rect>
        ):done?(
          <path d="M 44 50 Q 58 38 72 50" stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        ):error?(
          <><line x1="46" y1="38" x2="62" y2="54" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/><line x1="62" y1="38" x2="46" y2="54" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/></>
        ):(
          <>
            <rect x="44" y="38" width="28" height="14" rx="7" fill={c} opacity="0.9">
              <animate attributeName="height" values="14;2;14" dur="4s" repeatCount="indefinite" begin="1s"/>
              <animate attributeName="y" values="38;45;38" dur="4s" repeatCount="indefinite" begin="1s"/>
            </rect>
            <circle cx="58" cy="44" r="4" fill="#000" opacity="0.7"/>
            <circle cx="61" cy="41" r="2" fill="#fff" opacity="0.35"/>
          </>
        )}
        {working?(
          <rect x="88" y="38" width="28" height="12" rx="4" fill={c}>
            <animate attributeName="width" values="14;28;14" dur="0.7s" repeatCount="indefinite"/>
            <animate attributeName="x" values="102;88;102" dur="0.7s" repeatCount="indefinite"/>
          </rect>
        ):done?(
          <path d="M 88 50 Q 102 38 116 50" stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        ):error?(
          <><line x1="90" y1="38" x2="106" y2="54" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/><line x1="106" y1="38" x2="90" y2="54" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/></>
        ):(
          <>
            <rect x="88" y="38" width="28" height="14" rx="7" fill={c} opacity="0.9">
              <animate attributeName="height" values="14;2;14" dur="4s" repeatCount="indefinite" begin="2.2s"/>
              <animate attributeName="y" values="38;45;38" dur="4s" repeatCount="indefinite" begin="2.2s"/>
            </rect>
            <circle cx="102" cy="44" r="4" fill="#000" opacity="0.7"/>
            <circle cx="105" cy="41" r="2" fill="#fff" opacity="0.35"/>
          </>
        )}
        {working?(
          <><rect x="56" y="68" width="48" height="7" rx="3.5" fill="#111"/><rect x="56" y="68" width="48" height="7" rx="3.5" fill={c} opacity="0.85"><animate attributeName="width" values="10;48;18;48" dur="1.4s" repeatCount="indefinite"/></rect></>
        ):done?(
          <path d="M 52 70 Q 80 86 108 70" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round"/>
        ):error?(
          <path d="M 56 80 Q 80 68 104 80" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        ):(
          <path d="M 60 72 Q 80 80 100 72" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
        )}
        <line x1="80" y1="18" x2="80" y2={working?"2":"8"} stroke={c} strokeWidth="2.5" strokeLinecap="round" style={{transition:'all 0.3s'}}/>
        <circle cx="80" cy={working?"0":"6"} r={working?"5":"3.5"} fill={c} style={{transition:'all 0.3s'}}>
          {working&&<animate attributeName="r" values="4;7;4" dur="0.6s" repeatCount="indefinite"/>}
          {working&&<animate attributeName="opacity" values="1;0.4;1" dur="0.6s" repeatCount="indefinite"/>}
        </circle>
        {state==='thinking'&&[0,1,2].map(i=>(
          <circle key={i} cx={118+i*11} cy={24} r="3.5" fill={c}>
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin={`${i*0.3}s`} repeatCount="indefinite"/>
            <animate attributeName="cy" values="24;16;24" dur="1.2s" begin={`${i*0.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        {done&&(
          <g>
            <circle cx="130" cy="20" r="13" fill="#10B981" opacity="0.15"/>
            <path d="M 123 20 L 129 26 L 137 14" stroke="#10B981" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <animate attributeName="opacity" values="0;1" dur="0.3s" fill="freeze"/>
            </path>
          </g>
        )}
        {working&&[{cx:22,cy:78},{cx:138,cy:76},{cx:28,cy:128},{cx:136,cy:124}].map((p,i)=>(
          <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill={c}>
            <animate attributeName="opacity" values="0;1;0" dur={`${0.55+i*0.14}s`} begin={`${i*0.18}s`} repeatCount="indefinite"/>
            <animate attributeName="r" values="1.5;3.5;1.5" dur={`${0.55+i*0.14}s`} begin={`${i*0.18}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const router   = useRouter()
  const supabase = createClient()
  const [user,setUser]=useState<any>(null)
  const [companyName,setCompanyName]=useState('')
  const [industry,setIndustry]=useState('')
  const [building,setBuilding]=useState('')
  const [savedKeys,setSavedKeys]=useState<any[]>([])
  const [activeKey,setActiveKey]=useState('')
  const [activeProvider,setActiveProvider]=useState('gemini')
  const [newKeyVal,setNewKeyVal]=useState('')
  const [newKeyProv,setNewKeyProv]=useState('gemini')
  const [addingKey,setAddingKey]=useState(false)
  const [keyStatus,setKeyStatus]=useState<Record<string,string>>({})
  const [keyTesting,setKeyTesting]=useState<Record<string,boolean>>({})
  const [keyVisible,setKeyVisible]=useState<Record<string,boolean>>({})
  const [messages,setMessages]=useState<Message[]>([])
  const [input,setInput]=useState('')
  const [taskState,setTaskState]=useState<TaskState>('idle')
  const [lockedOp,setLockedOp]=useState<OperatorId|null>(null)
  const [steps,setSteps]=useState<string[]>([])
  const [taskCount,setTaskCount]=useState(0)
  const [deliverable,setDeliverable]=useState<Deliverable|null>(null)
  const [showDeliverable,setShowDeliverable]=useState(false)
  const [activeTab,setActiveTab]=useState<'output'|'preview'>('output')
  const [showSettings,setShowSettings]=useState(false)
  const [settingsTab,setSettingsTab]=useState<'workspace'|'apikeys'>('workspace')
  const [savingWS,setSavingWS]=useState(false)
  const [deployMsg,setDeployMsg]=useState('')
  const [mentionOpen,setMentionOpen]=useState(false)
  const bottomRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLTextAreaElement>(null)
  const timers=useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){router.push('/login');return}
      setUser(user)
      supabase.from('api_keys').select('*').eq('user_id',user.id).then(({data})=>{
        if(data?.length){setSavedKeys(data);setActiveKey(data[0].key_value);setActiveProvider(data[0].provider)}
      })
      supabase.from('workspaces').select('*').eq('user_id',user.id).limit(1).then(({data})=>{
        if(data?.[0]){setCompanyName(data[0].company_name||'');setIndustry(data[0].industry||'');setBuilding(data[0].building||'')}
      })
    })
  },[])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  const displayOpId:OperatorId=lockedOp||(input.trim()?detectOperator(input):'scout')
  const displayOp=OPERATORS[displayOpId]

  const switchOp=(opId:OperatorId)=>{
    if(lockedOp&&lockedOp!==opId){
      setMessages(prev=>[...prev,{id:`sys-${Date.now()}`,role:'system',content:`── Switched to ${OPERATORS[opId].name} ──`,timestamp:new Date()}])
    }
    setLockedOp(opId);setMentionOpen(false)
  }

  const handleInput=(val:string)=>{
    setInput(val)
    if(val.endsWith('@'))setMentionOpen(true)
    else if(!val.includes('@'))setMentionOpen(false)
  }

  const runTask=useCallback(async()=>{
    if(!input.trim()||taskState==='thinking'||taskState==='working')return
    const goal=input.trim()
    const opId:OperatorId=lockedOp||detectOperator(goal)
    const operator=OPERATORS[opId]
    setInput('');setMentionOpen(false)
    if(!lockedOp){
      setLockedOp(opId)
      setMessages(prev=>[...prev,{id:`sys-${Date.now()}`,role:'system',content:`── ${operator.name} locked to this conversation ──`,timestamp:new Date()}])
    }
    setTaskState('thinking');setSteps([]);setShowDeliverable(false);setTaskCount(c=>c+1)
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'user',content:goal,timestamp:new Date()}])
    operator.thinkingPhrases.forEach((p,i)=>{
      const t=setTimeout(()=>{setSteps(prev=>[...prev,p]);if(i===1)setTaskState('working')},i*900)
      timers.current.push(t)
    })
    try{
      if(!activeKey)throw new Error('no_key')
      const res=await fetch('/api/run-task',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({task:goal,systemPrompt:operator.systemPrompt+(companyName?`\n\nContext: ${companyName}. ${building}`:''),apiKey:activeKey,provider:activeProvider}),
      })
      timers.current.forEach(clearTimeout);timers.current=[]
      if(!res.ok)throw new Error('api_error')
      const data=await res.json()
      const raw=data.result||data.output||data.content||'Task completed.'
      setSteps(operator.thinkingPhrases)
      await new Promise(r=>setTimeout(r,400))
      setTaskState('done')
      const{display,code,lang,type}=parseOutput(raw)
      const hasCode=type!=='text'
      setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:'assistant',content:display,operator:opId,hasCode,timestamp:new Date()}])
      if(hasCode){
        setDeliverable({content:code,rawContent:raw,operator:opId,goal,language:lang,type})
        setActiveTab('output')
        setTimeout(()=>{setShowDeliverable(true);setTaskState('idle')},900)
      }else{setTimeout(()=>setTaskState('idle'),2500)}
    }catch(err:any){
      timers.current.forEach(clearTimeout)
      setTaskState('error')
      const msg=err.message==='no_key'?'⚠️ No API key connected. Open Settings → API Keys to add one.':'⚠️ Something went wrong. Check your API key in Settings.'
      setMessages(prev=>[...prev,{id:(Date.now()+2).toString(),role:'assistant',content:msg,operator:opId,timestamp:new Date()}])
      setTimeout(()=>setTaskState('idle'),2500)
    }
  },[input,taskState,activeKey,activeProvider,companyName,building,lockedOp])

  const handleKey=(e:React.KeyboardEvent)=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();runTask()}
    if(e.key==='Escape')setMentionOpen(false)
  }

  const testKey=async(keyId:string,prov:string,keyVal:string)=>{
    setKeyTesting(p=>({...p,[keyId]:true}));setKeyStatus(p=>({...p,[keyId]:''}))
    try{const res=await fetch('/api/run-task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'Say OK',systemPrompt:'Reply with just OK',apiKey:keyVal,provider:prov})});setKeyStatus(p=>({...p,[keyId]:res.ok?'valid':'invalid'}))}
    catch{setKeyStatus(p=>({...p,[keyId]:'invalid'}))}
    setKeyTesting(p=>({...p,[keyId]:false}))
  }

  const deleteKey=async(keyId:string)=>{
    await supabase.from('api_keys').delete().eq('id',keyId)
    const updated=savedKeys.filter(k=>k.id!==keyId);setSavedKeys(updated)
    if(updated.length){setActiveKey(updated[0].key_value);setActiveProvider(updated[0].provider)}
    else{setActiveKey('');setActiveProvider('gemini')}
  }

  const addKey=async()=>{
    if(!newKeyVal.trim()||!user)return
    await supabase.from('api_keys').upsert({user_id:user.id,provider:newKeyProv,key_value:newKeyVal.trim()},{onConflict:'user_id,provider'})
    setNewKeyVal('');setAddingKey(false)
    supabase.from('api_keys').select('*').eq('user_id',user.id).then(({data})=>{
      if(data?.length){setSavedKeys(data);setActiveKey(data[0].key_value);setActiveProvider(data[0].provider)}
    })
  }

  const downloadFile=()=>{
    if(!deliverable)return
    const ext:Record<string,string>={html:'html',python:'py',css:'css',javascript:'js',js:'js',typescript:'ts',tsx:'tsx',jsx:'jsx'}
    const blob=new Blob([deliverable.content],{type:'text/plain'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a')
    a.href=url;a.download=`orbium-${deliverable.operator}.${ext[deliverable.language]||'txt'}`;a.click();URL.revokeObjectURL(url)
  }

  const hintText=lockedOp?`🔒 ${OPERATORS[lockedOp].name} is handling this`:input.trim()?`${OPERATORS[detectOperator(input)].name} will handle this`:null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@300;400;500&display=swap');
        :root{--syne:'Syne',sans-serif;--mono:'JetBrains Mono',monospace;}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#000;color:#fff;font-family:var(--mono);overflow:hidden;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#111;border-radius:2px;}
        @keyframes rFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes rBob{0%{transform:translateY(0)scale(1)}100%{transform:translateY(-6px)scale(1.02)}}
        @keyframes rJump{0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)scale(1.06)}60%{transform:translateY(-10px)}}
        @keyframes rShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stepIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes popIn{from{opacity:0;transform:translateY(6px)scale(.97)}to{opacity:1;transform:translateY(0)scale(1)}}
        .hov:hover{background:rgba(255,255,255,.04)!important;}
        .hov2:hover{opacity:.8!important;}
        .hov3:hover{opacity:1!important;}
        .tabh:hover{color:#555!important;}
        input:focus,select:focus,textarea:focus{outline:none!important;border-color:rgba(99,102,241,.4)!important;}
      `}</style>
      <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>

        {/* SIDEBAR */}
        <div style={{width:210,background:'#030303',borderRight:'1px solid #0C0C0C',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'16px 14px 12px',borderBottom:'1px solid #0C0C0C'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#6366F1,#06B6D4)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:12,color:'#fff'}}>O</div>
              <span style={{fontFamily:'var(--syne)',fontWeight:800,fontSize:14,letterSpacing:'-0.03em'}}>Orbium AI</span>
            </div>
            <div style={{marginTop:5,fontSize:8,color:'#1A1A1A',fontWeight:700,letterSpacing:'0.1em'}}>WORKFORCE OS</div>
          </div>
          <div style={{padding:'10px 7px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:8,color:'#181818',fontWeight:700,letterSpacing:'0.12em',padding:'0 7px',marginBottom:6}}>YOUR TEAM</div>
            {Object.values(OPERATORS).map(o=>(
              <button key={o.id} className="hov" onClick={()=>switchOp(o.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:9,border:'none',background:lockedOp===o.id?o.bg:'transparent',cursor:'pointer',transition:'all 0.2s',marginBottom:2,outline:'none'}}>
                <div style={{width:26,height:26,borderRadius:7,background:lockedOp===o.id?o.bg:'#0D0D0D',border:`1px solid ${lockedOp===o.id?o.border:'#111'}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:11,color:lockedOp===o.id?o.color:'#252525',flexShrink:0,transition:'all 0.2s'}}>{o.name[0]}</div>
                <div style={{flex:1,textAlign:'left',overflow:'hidden'}}>
                  <div style={{fontFamily:'var(--syne)',fontSize:11,fontWeight:800,color:lockedOp===o.id?o.color:'#333',letterSpacing:'-0.01em'}}>{o.name}</div>
                  <div style={{fontSize:8,color:'#1C1C1C',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.role}</div>
                </div>
                {lockedOp===o.id&&<div style={{width:5,height:5,borderRadius:'50%',background:o.color,boxShadow:`0 0 6px ${o.color}`,flexShrink:0,animation:(taskState==='thinking'||taskState==='working')?'blink 0.8s infinite':'none'}}/>}
              </button>
            ))}
          </div>
          <div style={{padding:'8px 7px 12px',borderTop:'1px solid #0C0C0C'}}>
            <button className="hov" onClick={()=>setShowSettings(true)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:9,border:'none',background:'transparent',cursor:'pointer',color:'#1E1E1E',fontSize:11,fontFamily:'var(--syne)',fontWeight:700,transition:'all 0.2s',outline:'none',marginBottom:2}}>
              <div style={{width:26,height:26,borderRadius:7,background:'#0D0D0D',border:'1px solid #111',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>⚙</div>Settings
            </button>
            <button className="hov" onClick={async()=>{await supabase.auth.signOut();router.push('/')}} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:9,border:'none',background:'transparent',cursor:'pointer',color:'#161616',fontSize:11,fontFamily:'var(--syne)',fontWeight:700,transition:'all 0.2s',outline:'none'}}>
              <div style={{width:26,height:26,borderRadius:7,background:'#0D0D0D',border:'1px solid #111',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>↗</div>Sign out
            </button>
          </div>
        </div>

        {/* CHAT */}
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'#000',overflow:'hidden',borderRight:'1px solid #0C0C0C'}}>
          <div style={{padding:'12px 20px',borderBottom:'1px solid #0C0C0C',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button className="hov2" onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:5,background:'#0A0A0A',border:'1px solid #111',borderRadius:7,padding:'5px 10px',fontSize:10,color:'#333',cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,transition:'opacity 0.2s'}}>← Back</button>
              <div>
                <div style={{fontFamily:'var(--syne)',fontSize:13,fontWeight:800,letterSpacing:'-0.02em'}}>{companyName||'Your workspace'}</div>
                <div style={{fontSize:9,color:'#1C1C1C',marginTop:1}}>
                  {taskCount} tasks ·{' '}
                  {lockedOp?<span style={{color:OPERATORS[lockedOp].color}}>{OPERATORS[lockedOp].name} active</span>
                  :!activeKey?<span style={{color:'#F59E0B'}}>⚠ Add API key in Settings</span>
                  :<span>{activeProvider} connected</span>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {deliverable&&(
                <button className="hov2" onClick={()=>setShowDeliverable(s=>!s)} style={{background:showDeliverable?OPERATORS[deliverable.operator].bg:'#050505',border:`1px solid ${showDeliverable?OPERATORS[deliverable.operator].border:'#0D0D0D'}`,borderRadius:7,padding:'5px 12px',fontSize:9,color:showDeliverable?OPERATORS[deliverable.operator].color:'#2A2A2A',cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,transition:'all 0.2s'}}>
                  {showDeliverable?'← Robot':'Output →'}
                </button>
              )}
              <div style={{display:'flex',alignItems:'center',gap:5,background:'#050505',border:'1px solid #0A0A0A',borderRadius:7,padding:'5px 10px',fontSize:9,color:'#222'}}>
                <div style={{width:4,height:4,borderRadius:'50%',background:!activeKey?'#1E1E1E':'#10B981',boxShadow:activeKey?'0 0 5px #10B981':'none',animation:activeKey?'blink 2s infinite':'none'}}/>
                {!activeKey?'Not connected':'Team ready'}
              </div>
            </div>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:18}}>
            {messages.length===0?(
              <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:24,paddingTop:20}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--syne)',fontSize:24,fontWeight:900,letterSpacing:'-0.04em',marginBottom:8,background:'linear-gradient(135deg,#6366F1,#06B6D4,#EC4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>What should your<br/>team work on?</div>
                  <div style={{fontSize:11,color:'#1C1C1C'}}>Type @ to mention an agent directly. Or describe your goal.</div>
                  {!activeKey&&(
                    <button onClick={()=>{setShowSettings(true);setSettingsTab('apikeys')}} style={{marginTop:12,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'6px 14px',fontSize:10,color:'#F59E0B',cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700}}>
                      + Add API Key to get started →
                    </button>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,maxWidth:500,width:'100%'}}>
                  {SUGGESTIONS.map((s,i)=>{
                    const sOp=OPERATORS[s.op]
                    return(
                      <button key={i} className="hov" onClick={()=>{setInput(s.text);switchOp(s.op)}} style={{background:'#040404',border:'1px solid #0C0C0C',borderRadius:10,padding:'10px 12px',textAlign:'left',cursor:'pointer',transition:'all 0.2s',animation:`fadeUp 0.4s ${i*0.06}s ease both`,opacity:0,outline:'none'}}>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                          <div style={{width:14,height:14,borderRadius:4,background:sOp.bg,border:`1px solid ${sOp.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,fontFamily:'var(--syne)',color:sOp.color}}>{sOp.name[0]}</div>
                          <span style={{fontSize:8,color:sOp.color,fontWeight:700,letterSpacing:'0.06em'}}>{sOp.name.toUpperCase()}</span>
                        </div>
                        <div style={{fontSize:10,color:'#2A2A2A',lineHeight:1.5}}>{s.text}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ):(
              messages.map(msg=>{
                if(msg.role==='system')return(<div key={msg.id} style={{textAlign:'center',fontSize:9,color:'#1E1E1E',letterSpacing:'0.05em',animation:'fadeUp 0.3s ease'}}>{msg.content}</div>)
                const mOp=msg.operator?OPERATORS[msg.operator]:null
                return(
                  <div key={msg.id} style={{animation:'fadeUp 0.3s ease both'}}>
                    {msg.role==='user'?(
                      <div style={{display:'flex',justifyContent:'flex-end'}}>
                        <div style={{background:'#0A0A0A',border:'1px solid #141414',borderRadius:'12px 12px 3px 12px',padding:'9px 14px',maxWidth:'70%',fontSize:12,color:'#666',lineHeight:1.7}}>{msg.content}</div>
                      </div>
                    ):(
                      <div style={{display:'flex',flexDirection:'column',gap:6,maxWidth:'86%'}}>
                        {mOp&&(
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <div style={{width:15,height:15,borderRadius:4,background:mOp.bg,border:`1px solid ${mOp.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:8,color:mOp.color}}>{mOp.name[0]}</div>
                            <span style={{fontSize:9,color:mOp.color,fontWeight:700,letterSpacing:'0.08em'}}>{mOp.name.toUpperCase()} · {new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                          </div>
                        )}
                        <div style={{background:'#040404',border:`1px solid ${mOp?.border||'#0C0C0C'}`,borderRadius:'3px 12px 12px 12px',padding:'13px 15px',fontSize:11,color:'#4A4A4A',lineHeight:1.9,whiteSpace:'pre-wrap',position:'relative'}}>
                          {msg.content}
                          {msg.hasCode&&(
                            <button className="hov2" onClick={()=>{setShowDeliverable(true);setActiveTab('output')}} style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:10,background:mOp?.bg,border:`1px solid ${mOp?.border}`,borderRadius:6,padding:'4px 10px',fontSize:9,color:mOp?.color,cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,transition:'opacity 0.2s'}}>
                              {'</>'} View Code & Preview →
                            </button>
                          )}
                          {msg.content.includes('Settings')&&!msg.hasCode&&(
                            <button className="hov2" onClick={()=>{setShowSettings(true);setSettingsTab('apikeys')}} style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:10,marginLeft:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.18)',borderRadius:6,padding:'4px 10px',fontSize:9,color:'#F59E0B',cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,transition:'opacity 0.2s'}}>
                              + Open Settings →
                            </button>
                          )}
                          <button className="hov3" onClick={()=>navigator.clipboard.writeText(msg.content)} style={{position:'absolute',top:9,right:9,background:'#0D0D0D',border:'1px solid #141414',borderRadius:5,padding:'2px 7px',fontSize:8,color:'#222',cursor:'pointer',opacity:0.4,transition:'opacity 0.2s',fontFamily:'var(--syne)',fontWeight:700}}>COPY</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{padding:'12px 20px',borderTop:'1px solid #0C0C0C',flexShrink:0,position:'relative'}}>
            {mentionOpen&&(
              <div style={{position:'absolute',bottom:'100%',left:20,background:'#0A0A0A',border:'1px solid #1A1A1A',borderRadius:12,padding:'6px',marginBottom:6,animation:'popIn 0.15s ease',zIndex:100,minWidth:220}}>
                {Object.values(OPERATORS).map(o=>(
                  <button key={o.id} className="hov" onClick={()=>{switchOp(o.id);setInput('@'+o.name.toLowerCase()+' ')}} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:7,border:'none',background:'transparent',cursor:'pointer',outline:'none'}}>
                    <div style={{width:20,height:20,borderRadius:5,background:o.bg,border:`1px solid ${o.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--syne)',fontWeight:900,fontSize:9,color:o.color}}>{o.name[0]}</div>
                    <span style={{fontSize:11,fontFamily:'var(--syne)',fontWeight:800,color:'#555'}}>@{o.name.toLowerCase()}</span>
                    <span style={{fontSize:9,color:'#222'}}>{o.role}</span>
                  </button>
                ))}
              </div>
            )}
            {hintText&&(
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7,fontSize:9,color:displayOp.color,animation:'fadeUp 0.2s ease'}}>
                <div style={{width:4,height:4,borderRadius:'50%',background:displayOp.color,boxShadow:`0 0 5px ${displayOp.color}`,animation:'blink 1s infinite'}}/>
                {hintText}
                {lockedOp&&<button onClick={()=>setLockedOp(null)} style={{marginLeft:6,background:'none',border:'none',color:'#222',fontSize:9,cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,padding:0}}>switch →</button>}
              </div>
            )}
            <div style={{display:'flex',gap:8,background:'#040404',border:`1px solid ${hintText?displayOp.border:'#0C0C0C'}`,borderRadius:12,padding:'10px 13px',transition:'border-color 0.3s'}}>
              <textarea ref={inputRef} value={input} onChange={e=>handleInput(e.target.value)} onKeyDown={handleKey}
                placeholder={lockedOp?`Ask ${OPERATORS[lockedOp].name} anything... (type @ to switch)`:'What should your team work on? (type @ to mention an agent)'}
                disabled={taskState==='thinking'||taskState==='working'} rows={1}
                style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#777',fontSize:12,fontFamily:'var(--mono)',resize:'none',lineHeight:1.7,maxHeight:90,opacity:(taskState==='thinking'||taskState==='working')?0.4:1}}/>
              <button className="hov2" onClick={runTask} disabled={!input.trim()||taskState==='thinking'||taskState==='working'}
                style={{background:input.trim()?displayOp.color:'#0D0D0D',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'default',flexShrink:0,transition:'all 0.2s',alignSelf:'flex-end',fontSize:14,opacity:input.trim()?1:0.2}}>
                {taskState==='thinking'||taskState==='working'?'⏳':'→'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:320,background:'#020202',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          {!showDeliverable?(
            <>
              <div style={{padding:'16px 16px 12px',borderBottom:'1px solid #0C0C0C',flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:displayOp.color,boxShadow:`0 0 6px ${displayOp.color}`,animation:'blink 2s infinite'}}/>
                  <span style={{fontSize:8,color:'#1A1A1A',fontWeight:700,letterSpacing:'0.12em'}}>ACTIVE OPERATOR</span>
                </div>
                <div style={{fontFamily:'var(--syne)',fontSize:16,fontWeight:900,letterSpacing:'-0.03em'}}>{displayOp.name}</div>
                <div style={{fontSize:9,color:displayOp.color,fontWeight:700,letterSpacing:'0.05em'}}>{displayOp.role.toUpperCase()}</div>
              </div>
              <div style={{padding:'20px 16px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,borderBottom:'1px solid #0C0C0C',background:`radial-gradient(ellipse at center top,${displayOp.bg} 0%,transparent 60%)`,transition:'background 0.6s',flexShrink:0}}>
                <OrbiumRobot op={displayOp} state={taskState}/>
                <div style={{display:'flex',alignItems:'center',gap:6,background:'#050505',border:'1px solid #0C0C0C',borderRadius:100,padding:'5px 14px',fontSize:10,fontWeight:700,fontFamily:'var(--syne)',transition:'color 0.3s',
                  color:taskState==='done'?'#10B981':taskState==='error'?'#EF4444':taskState==='idle'?'#1E1E1E':displayOp.color}}>
                  <div style={{width:5,height:5,borderRadius:'50%',transition:'background 0.3s',
                    background:taskState==='done'?'#10B981':taskState==='error'?'#EF4444':taskState==='idle'?'#161616':displayOp.color,
                    animation:(taskState==='thinking'||taskState==='working')?'blink 0.8s infinite':'none'}}/>
                  {taskState==='idle'&&'Standing by'}{taskState==='thinking'&&'Initialising...'}{taskState==='working'&&displayOp.workingLabel}{taskState==='done'&&'Task complete ✓'}{taskState==='error'&&'Error occurred'}
                </div>
              </div>
              <div style={{flex:1,padding:'16px',overflowY:'auto'}}>
                {steps.length>0?(
                  <div>
                    <div style={{fontSize:8,color:'#181818',fontWeight:700,letterSpacing:'0.1em',marginBottom:10}}>PROCESS LOG</div>
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      {steps.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,animation:`stepIn 0.4s ${i*0.12}s ease both`,opacity:0}}>
                          <div style={{width:17,height:17,borderRadius:5,background:displayOp.bg,border:`1px solid ${displayOp.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <div style={{width:5,height:5,borderRadius:'50%',background:displayOp.color}}/>
                          </div>
                          <span style={{fontSize:11,color:'#3A3A3A'}}>{s}</span>
                        </div>
                      ))}
                    </div>
                    {(taskState==='thinking'||taskState==='working')&&(
                      <div style={{display:'flex',gap:4,marginTop:10,paddingLeft:4}}>
                        {[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:'50%',background:displayOp.color,animation:`blink 0.8s ${i*0.22}s infinite`}}/>)}
                      </div>
                    )}
                  </div>
                ):(
                  <div>
                    <div style={{fontSize:8,color:'#181818',fontWeight:700,letterSpacing:'0.1em',marginBottom:10}}>CAPABILITIES</div>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {displayOp.keywords.slice(0,7).map((kw,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6,animation:`stepIn 0.3s ${i*0.04}s ease both`,opacity:0}}>
                          <div style={{width:3,height:3,borderRadius:'50%',background:displayOp.border,flexShrink:0}}/>
                          <span style={{fontSize:10,color:'#1E1E1E',textTransform:'capitalize'}}>{kw}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:16,background:displayOp.bg,border:`1px solid ${displayOp.border}`,borderRadius:9,padding:'10px 12px',fontSize:10,color:'#333',lineHeight:1.7,fontStyle:'italic'}}>
                      "{displayOp.greeting}"
                    </div>
                  </div>
                )}
              </div>
            </>
          ):(
            deliverable&&(
              <div style={{display:'flex',flexDirection:'column',height:'100%',animation:'slideIn 0.3s ease'}}>
                <div style={{padding:'13px 15px',borderBottom:'1px solid #0C0C0C',flexShrink:0}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:'#10B981',boxShadow:'0 0 6px #10B981'}}/>
                      <span style={{fontSize:8,color:'#10B981',fontWeight:700,letterSpacing:'0.1em'}}>OUTPUT READY</span>
                    </div>
                    <button className="hov3" onClick={()=>setShowDeliverable(false)} style={{background:'none',border:'none',color:'#1E1E1E',cursor:'pointer',fontSize:16,lineHeight:1,opacity:0.5,transition:'opacity 0.2s'}}>×</button>
                  </div>
                  <div style={{fontFamily:'var(--syne)',fontSize:12,fontWeight:800,letterSpacing:'-0.02em',marginBottom:2}}>{OPERATORS[deliverable.operator].name}'s Deliverable</div>
                  <div style={{fontSize:9,color:'#252525',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{deliverable.goal}</div>
                </div>
                <div style={{display:'flex',borderBottom:'1px solid #0C0C0C',flexShrink:0}}>
                  {(['output','preview'] as const).map(tab=>(
                    <button key={tab} className="tabh" onClick={()=>setActiveTab(tab)} style={{flex:1,padding:'9px',fontSize:8,fontFamily:'var(--syne)',fontWeight:700,letterSpacing:'0.1em',background:'transparent',border:'none',cursor:'pointer',transition:'all 0.2s',outline:'none',textTransform:'uppercase',color:activeTab===tab?OPERATORS[deliverable.operator].color:'#1E1E1E',borderBottom:`2px solid ${activeTab===tab?OPERATORS[deliverable.operator].color:'transparent'}`}}>{tab}</button>
                  ))}
                </div>
                <div style={{flex:1,overflow:'hidden'}}>
                  {activeTab==='output'?(
                    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 13px',background:'#050505',borderBottom:'1px solid #0C0C0C',flexShrink:0}}>
                        <span style={{fontSize:8,color:'#222',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase'}}>{deliverable.language}</span>
                        <button className="hov3" onClick={()=>navigator.clipboard.writeText(deliverable.content)} style={{background:'#0D0D0D',border:'1px solid #141414',borderRadius:4,padding:'2px 7px',fontSize:8,color:'#222',cursor:'pointer',opacity:0.5,transition:'opacity 0.2s',fontFamily:'var(--syne)',fontWeight:700}}>COPY</button>
                      </div>
                      <div style={{flex:1,overflowY:'auto'}}>
                        <pre style={{padding:'13px',fontSize:10,lineHeight:1.85,fontFamily:'var(--mono)',color:'#3A3A3A',margin:0,overflowX:'auto'}} dangerouslySetInnerHTML={{__html:highlight(deliverable.content,deliverable.language)}}/>
                      </div>
                    </div>
                  ):(
                    <div style={{height:'100%',background:deliverable.type==='html'?'#fff':'#040404'}}>
                      {deliverable.type==='html'?<iframe srcDoc={deliverable.content} style={{width:'100%',height:'100%',border:'none'}} sandbox="allow-scripts" title="Preview"/>
                      :<div style={{padding:'18px',fontSize:12,lineHeight:1.8,color:'#555',height:'100%',overflowY:'auto',whiteSpace:'pre-wrap',fontFamily:'var(--mono)'}}>{deliverable.content}</div>}
                    </div>
                  )}
                </div>
                <div style={{padding:'11px 13px',borderTop:'1px solid #0C0C0C',display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                  <div style={{display:'flex',gap:6}}>
                    <button className="hov2" onClick={()=>navigator.clipboard.writeText(deliverable.rawContent)} style={{flex:1,background:OPERATORS[deliverable.operator].bg,border:`1px solid ${OPERATORS[deliverable.operator].border}`,borderRadius:7,padding:'8px',fontSize:9,fontFamily:'var(--syne)',fontWeight:800,color:OPERATORS[deliverable.operator].color,cursor:'pointer',transition:'opacity 0.2s'}}>📋 Copy All</button>
                    <button className="hov2" onClick={downloadFile} style={{flex:1,background:'#0D0D0D',border:'1px solid #141414',borderRadius:7,padding:'8px',fontSize:9,fontFamily:'var(--syne)',fontWeight:800,color:'#555',cursor:'pointer',transition:'opacity 0.2s'}}>⬇ Download</button>
                  </div>
                  <button className="hov2" onClick={()=>{setDeployMsg('Opening Vercel...');window.open('https://vercel.com/new','_blank');setTimeout(()=>setDeployMsg(''),3000)}} style={{width:'100%',background:'#fff',border:'none',borderRadius:7,padding:'9px',fontSize:10,fontFamily:'var(--syne)',fontWeight:900,color:'#000',cursor:'pointer',transition:'opacity 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    {deployMsg||'▲ Deploy to Vercel'}
                  </button>
                  <button className="hov2" onClick={()=>setShowDeliverable(false)} style={{width:'100%',background:'transparent',border:'1px solid #0C0C0C',borderRadius:7,padding:'7px',fontSize:9,fontFamily:'var(--syne)',fontWeight:700,color:'#1E1E1E',cursor:'pointer',transition:'opacity 0.2s'}}>← Back to Robot</button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings&&(
        <div onClick={()=>setShowSettings(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(12px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#040404',border:'1px solid #111',borderRadius:18,width:500,maxWidth:'92vw',maxHeight:'85vh',display:'flex',flexDirection:'column',animation:'modalIn 0.25s ease',overflow:'hidden'}}>
            <div style={{padding:'20px 22px 14px',borderBottom:'1px solid #0C0C0C',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <div style={{fontFamily:'var(--syne)',fontSize:16,fontWeight:900,letterSpacing:'-0.03em'}}>Settings</div>
                <div style={{fontSize:10,color:'#222',marginTop:2}}>Workspace & API keys</div>
              </div>
              <button className="hov3" onClick={()=>setShowSettings(false)} style={{background:'#0D0D0D',border:'1px solid #141414',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#333',fontSize:16,opacity:0.6,transition:'opacity 0.2s'}}>×</button>
            </div>
            <div style={{display:'flex',borderBottom:'1px solid #0C0C0C',flexShrink:0}}>
              {([{id:'workspace',label:'WORKSPACE'},{id:'apikeys',label:'API KEYS'}] as const).map(t=>(
                <button key={t.id} className="tabh" onClick={()=>setSettingsTab(t.id)} style={{flex:1,padding:'11px',fontSize:9,fontFamily:'var(--syne)',fontWeight:700,letterSpacing:'0.08em',background:'transparent',border:'none',cursor:'pointer',transition:'all 0.2s',outline:'none',color:settingsTab===t.id?'#fff':'#1E1E1E',borderBottom:`2px solid ${settingsTab===t.id?'#6366F1':'transparent'}`}}>{t.label}</button>
              ))}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'20px 22px'}}>
              {settingsTab==='workspace'&&(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[{label:'COMPANY NAME',val:companyName,set:setCompanyName,ph:'e.g. Orbium AI'},{label:'INDUSTRY',val:industry,set:setIndustry,ph:'e.g. SaaS, Fintech'},{label:"WHAT YOU'RE BUILDING",val:building,set:setBuilding,ph:'e.g. AI workforce platform'}].map(f=>(
                    <div key={f.label}>
                      <label style={{display:'block',fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em',marginBottom:7}}>{f.label}</label>
                      <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{width:'100%',background:'#0A0A0A',border:'1px solid #111',borderRadius:9,padding:'10px 13px',color:'#777',fontSize:12,fontFamily:'var(--mono)',transition:'border-color 0.2s'}}/>
                    </div>
                  ))}
                  <button className="hov2" onClick={async()=>{if(!user)return;setSavingWS(true);await supabase.from('workspaces').upsert({user_id:user.id,company_name:companyName,industry,building},{onConflict:'user_id'});setSavingWS(false)}} style={{background:'#fff',color:'#000',border:'none',borderRadius:9,padding:'11px',fontFamily:'var(--syne)',fontWeight:900,fontSize:12,cursor:'pointer',transition:'opacity 0.2s',marginTop:4}}>
                    {savingWS?'Saving...':'Save Workspace'}
                  </button>
                </div>
              )}
              {settingsTab==='apikeys'&&(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{fontSize:9,color:'#222',lineHeight:1.6}}>
                    Bring your own API key. Gemini has a free tier.{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:'#06B6D4',textDecoration:'none',fontWeight:700}}>Get Gemini key free →</a>
                  </div>
                  {savedKeys.length>0&&(
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em'}}>SAVED KEYS</div>
                      {savedKeys.map(k=>(
                        <div key={k.id} onClick={()=>{setActiveKey(k.key_value);setActiveProvider(k.provider)}} style={{background:'#0A0A0A',border:`1px solid ${activeKey===k.key_value?'rgba(99,102,241,0.3)':'#111'}`,borderRadius:10,padding:'11px 13px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',transition:'border-color 0.2s'}}>
                          <div style={{width:7,height:7,borderRadius:'50%',background:activeKey===k.key_value?'#6366F1':'#1E1E1E',boxShadow:activeKey===k.key_value?'0 0 6px #6366F1':'none',flexShrink:0,transition:'all 0.2s'}}/>
                          <div style={{flex:1,overflow:'hidden'}}>
                            <div style={{fontFamily:'var(--syne)',fontSize:11,fontWeight:700,color:activeKey===k.key_value?'#fff':'#444',marginBottom:2}}>{k.provider.charAt(0).toUpperCase()+k.provider.slice(1)}</div>
                            <div style={{fontSize:9,color:'#1E1E1E',fontFamily:'var(--mono)'}}>{keyVisible[k.id]?k.key_value:'●●●●●●●●●●●●●●●●'}</div>
                          </div>
                          <div style={{display:'flex',gap:5,flexShrink:0}}>
                            {keyStatus[k.id]&&<div style={{fontSize:8,padding:'2px 7px',borderRadius:4,fontWeight:700,fontFamily:'var(--syne)',background:keyStatus[k.id]==='valid'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:keyStatus[k.id]==='valid'?'#10B981':'#EF4444',border:`1px solid ${keyStatus[k.id]==='valid'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`}}>{keyStatus[k.id]==='valid'?'✓ Valid':'✗ Invalid'}</div>}
                            <button className="hov2" onClick={e=>{e.stopPropagation();setKeyVisible(p=>({...p,[k.id]:!p[k.id]}))}} style={{background:'#111',border:'1px solid #1A1A1A',borderRadius:5,padding:'3px 7px',fontSize:9,color:'#333',cursor:'pointer',transition:'opacity 0.2s'}}>{keyVisible[k.id]?'👁':'○'}</button>
                            <button className="hov2" onClick={e=>{e.stopPropagation();testKey(k.id,k.provider,k.key_value)}} disabled={keyTesting[k.id]} style={{background:'#111',border:'1px solid #1A1A1A',borderRadius:5,padding:'3px 7px',fontSize:9,color:'#333',cursor:'pointer',transition:'opacity 0.2s',fontFamily:'var(--syne)',fontWeight:700}}>{keyTesting[k.id]?'...':'Test'}</button>
                            <button className="hov2" onClick={e=>{e.stopPropagation();deleteKey(k.id)}} style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:5,padding:'3px 7px',fontSize:9,color:'#EF4444',cursor:'pointer',transition:'opacity 0.2s'}}>🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!addingKey?(
                    <button className="hov" onClick={()=>setAddingKey(true)} style={{background:'#0A0A0A',border:'1px dashed #1A1A1A',borderRadius:10,padding:'11px',fontSize:10,color:'#2A2A2A',cursor:'pointer',fontFamily:'var(--syne)',fontWeight:700,transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>+ Add API Key</button>
                  ):(
                    <div style={{background:'#0A0A0A',border:'1px solid #1A1A1A',borderRadius:10,padding:'14px'}}>
                      <div style={{fontSize:8,color:'#333',fontWeight:700,letterSpacing:'0.1em',marginBottom:10}}>NEW API KEY</div>
                      <div style={{marginBottom:10}}>
                        <label style={{display:'block',fontSize:8,color:'#2A2A2A',fontWeight:700,letterSpacing:'0.08em',marginBottom:6}}>PROVIDER</label>
                        <select value={newKeyProv} onChange={e=>setNewKeyProv(e.target.value)} style={{width:'100%',background:'#060606',border:'1px solid #111',borderRadius:7,padding:'9px 12px',color:'#666',fontSize:11,fontFamily:'var(--mono)',cursor:'pointer'}}>
                          {PROVIDERS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                        </select>
                      </div>
                      <div style={{marginBottom:12}}>
                        <label style={{display:'block',fontSize:8,color:'#2A2A2A',fontWeight:700,letterSpacing:'0.08em',marginBottom:6}}>API KEY</label>
                        <input type="password" value={newKeyVal} onChange={e=>setNewKeyVal(e.target.value)} placeholder="Paste your API key..." style={{width:'100%',background:'#060606',border:'1px solid #111',borderRadius:7,padding:'9px 12px',color:'#777',fontSize:11,fontFamily:'var(--mono)'}}/>
                      </div>
                      <div style={{display:'flex',gap:7}}>
                        <button className="hov2" onClick={addKey} style={{flex:1,background:'#fff',color:'#000',border:'none',borderRadius:7,padding:'9px',fontFamily:'var(--syne)',fontWeight:900,fontSize:11,cursor:'pointer',transition:'opacity 0.2s'}}>Save Key</button>
                        <button className="hov2" onClick={()=>{setAddingKey(false);setNewKeyVal('')}} style={{background:'#0D0D0D',color:'#333',border:'1px solid #111',borderRadius:7,padding:'9px 14px',fontFamily:'var(--syne)',fontWeight:700,fontSize:11,cursor:'pointer',transition:'opacity 0.2s'}}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}