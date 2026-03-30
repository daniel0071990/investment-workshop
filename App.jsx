import { useState, useEffect, useRef } from "react";
import { submitQuizScore, loadAllScores, onScoresChanged, clearAllScores } from "./firebase.js";

const C = {
  bg: "#0a0f1a", card: "#111827", border: "#1e293b",
  accent: "#22d3ee", accentDim: "rgba(34,211,238,0.15)",
  green: "#34d399", greenDim: "rgba(52,211,153,0.15)",
  red: "#f87171", redDim: "rgba(248,113,113,0.15)",
  amber: "#fbbf24", amberDim: "rgba(251,191,36,0.15)",
  purple: "#a78bfa", purpleDim: "rgba(167,139,250,0.15)",
  text: "#f1f5f9", textMuted: "#94a3b8", textDim: "#64748b",
  gold: "#fbbf24", silver: "#cbd5e1", bronze: "#f59e0b",
};
const F = {
  display: "'DM Serif Display', Georgia, serif",
  body: "'DM Sans', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};
const DEFAULT_SETTINGS = {
  marketReturn: 8.0, valueReturn: 9.2, momentumReturn: 9.5, qualityReturn: 8.8, smallCapReturn: 9.0,
  passiveFee: 0.10, factorFee: 0.25, activeFee: 0.90, pizzaCost: 12.00, defaultGrowthRate: 8.0,
};

const quizQuestions = [
  { q: "What does a passive index fund try to do?", options: ["Beat the market by picking winners", "Match the return of a market index", "Only invest in tech stocks", "Avoid all risk entirely"], correct: 1, explanation: "A passive fund simply tracks an index like the FTSE 100 or S&P 500 — it doesn't try to outsmart the market, just mirror it." },
  { q: "Which of these is a common 'factor' in factor investing?", options: ["Luck", "Value", "Astrology", "Gut feeling"], correct: 1, explanation: "Value is one of the most researched factors — targeting stocks that appear cheap relative to fundamentals." },
  { q: "Over 20 years, roughly what % of active managers fail to beat a simple index fund?", options: ["About 25%", "About 50%", "About 75%", "Over 90%"], correct: 3, explanation: "Studies consistently show over 90% of active managers underperform their benchmark over 20 years." },
  { q: "Factor investing sits somewhere between…", options: ["Stocks and bonds", "Passive indexing and active stock-picking", "Savings accounts and property", "Crypto and commodities"], correct: 1, explanation: "Factor investing is rules-based like passive, but tilts towards characteristics like value or momentum." },
  { q: "Why do fees matter so much in investing?", options: ["They don't — performance is all that matters", "They compound over time, eating into returns", "Higher fees always mean better returns", "Fees only apply when you sell"], correct: 1, explanation: "Fees compound just like returns. Even a 1% difference can cost tens of thousands over a 30-year horizon." },
];

const jargonTerms = [
  { term: "Alpha", plain: "Extra return above the market. If the market returns 8% and your fund returns 10%, your alpha is 2%.", category: "Performance" },
  { term: "Beta", plain: "How much your investment moves with the market. Beta of 1 = exactly with the market. Higher = more volatile.", category: "Risk" },
  { term: "Expense Ratio", plain: "The annual fee to own a fund. 0.10% is cheap (passive), 0.90% is expensive (active).", category: "Fees" },
  { term: "Tracking Error", plain: "How closely a fund follows its index. Lower = more faithful. Like GPS accuracy.", category: "Performance" },
  { term: "Rebalancing", plain: "Adjusting your portfolio back to target mix. Like resetting scales when one side gets heavy.", category: "Strategy" },
  { term: "Drawdown", plain: "Peak-to-trough decline. If £100k drops to £70k, that's a 30% drawdown.", category: "Risk" },
  { term: "Dividend Yield", plain: "Annual income as a % of price. A £100 stock paying £3/year = 3% yield.", category: "Income" },
  { term: "Market Cap", plain: "Total value of a company's shares. Large cap = big companies, small cap = smaller ones.", category: "Size" },
  { term: "Sharpe Ratio", plain: "Return per unit of risk. Higher = better. Like miles per gallon for investments.", category: "Performance" },
  { term: "Factor Premium", plain: "The extra return for tilting towards a factor like value — the 'reward' for that specific risk.", category: "Factors" },
];

function generateCovidCrashData() {
  const raw = [100.0,100.8,101.2,101.5,102.3,103.1,100.5,96.8,91.2,85.3,78.5,72.1,66.2,70.8,74.5,77.2,79.8,80.5,82.3,84.1,85.0,86.2,84.8,86.5,88.0,89.2,90.5,91.0,92.3,93.5,95.0,96.8,98.2,99.5,97.8,96.5,98.0,99.0,97.5,96.0,97.8,100.5,104.2,108.0,110.5,111.8,113.2,114.5,116.0,117.0,116.2,115.0,116.8,118.0,119.5,118.2,119.0,120.5,121.8,122.0,123.5,125.0,126.2,127.5,128.0,128.5,129.0,130.2,131.0,132.0,133.5,134.0,135.5];
  const headlines = {4:"📰 Markets hit new highs",6:"📰 New virus in China — markets wobble",8:"🔴 WHO declares pandemic — sharp decline",10:"🔴 Countries in lockdown — worst week since 2008",11:"🔴 MSCI ACWI down 34% from peak",12:"🔴 Markets bottom — March 23, 2020",13:"📰 Central banks announce stimulus",15:"📰 Tentative recovery begins",20:"📰 Economies reopening — cautious optimism",28:"📰 Markets approaching pre-crash levels",32:"📰 Second wave fears — wobble",40:"✅ Vaccine breakthroughs — markets surge",44:"✅ All-time highs — full recovery",52:"✅ Strong rally into 2021",60:"✅ Portfolio 35% above starting value"};
  return { weeks: raw.map((v,i)=>({week:i,value:Math.round(v*1000),headline:headlines[i]||null})), decisionWeeks:[8,11,15,28,36] };
}
const covidData = generateCovidCrashData();

function genGrowth(seed, vol, annualReturn, years=20) {
  const md = Math.pow(1+annualReturn/100,1/12)-1; const pts=[]; let v=100;
  const rng=(s)=>{s=Math.sin(s)*10000;return s-Math.floor(s);};
  for(let y=0;y<=years*12;y++){v*=(1+(rng(seed+y*7.3)-0.48)*vol+md);if(y%3===0)pts.push({month:y,value:Math.round(v*100)/100});}
  return pts;
}
const fundPairs = [
  { aType:"Passive Index", bType:"Value Factor", aSeed:101, bSeed:202, aVol:0.025, bVol:0.055, insight:"The factor fund had higher returns but more volatility — the bumpy ride is the price of the premium." },
  { aType:"Momentum Factor", bType:"Passive Index", aSeed:303, bSeed:404, aVol:0.058, bVol:0.025, insight:"Momentum delivered slightly more but with wilder swings. Passive was more stable." },
  { aType:"Passive Index", bType:"Quality Factor", aSeed:505, bSeed:606, aVol:0.026, bVol:0.035, insight:"Very similar! Quality is a 'defensive' tilt — like passive but with slightly better downside protection." },
];

// ─── CHART COMPONENTS ──────────────────────────────────
function MiniChart({data,color,width=280,height=80}) {
  if(!data?.length)return null;
  const min=Math.min(...data.map(d=>d.value))*0.95,max=Math.max(...data.map(d=>d.value))*1.05;
  const pts=data.map((d,i)=>`${(i/(data.length-1))*width},${height-((d.value-min)/(max-min))*height}`);
  return(<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block",maxWidth:"100%"}}><path d={`M${pts.join(" L")} L${width},${height} L0,${height} Z`} fill={color} opacity="0.1"/><path d={`M${pts.join(" L")}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

function BigChart({datasets,width=700,height=300}) {
  if(!datasets?.length)return null;
  const allVals=datasets.flatMap(ds=>ds.data.map(d=>d.value));
  const min=Math.min(...allVals)*0.9,max=Math.max(...allVals)*1.05;
  const pad={top:20,right:20,bottom:30,left:55};
  const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
  const yTicks=Array.from({length:5},(_,i)=>min+((max-min)*i)/4);
  return(<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
    {yTicks.map((v,i)=>{const y=pad.top+h-((v-min)/(max-min))*h;return(<g key={i}><line x1={pad.left} x2={width-pad.right} y1={y} y2={y} stroke={C.border}/><text x={pad.left-8} y={y+4} textAnchor="end" fill={C.textDim} fontSize="11" fontFamily={F.mono}>{v>=1000?`${(v/1000).toFixed(1)}k`:Math.round(v)}</text></g>);})}
    {["0y","5y","10y","15y","20y"].map((l,i)=><text key={i} x={pad.left+(w*i)/4} y={height-6} textAnchor="middle" fill={C.textDim} fontSize="11" fontFamily={F.mono}>{l}</text>)}
    {datasets.map((ds,di)=>{const pts=ds.data.map((d,i)=>`${pad.left+(i/(ds.data.length-1))*w},${pad.top+h-((d.value-min)/(max-min))*h}`);return<path key={di} d={`M${pts.join(" L")}`} fill="none" stroke={ds.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>;})}
  </svg>);
}

function CrashChart({data,soldWeek,width=700,height=300}) {
  if(!data?.length)return null;
  const vals=data.map(d=>d.value);
  const min=Math.min(...vals)*0.92,max=Math.max(...vals)*1.05;
  const pad={top:20,right:20,bottom:45,left:65};
  const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
  const x=(i)=>pad.left+(i/(data.length-1))*w;
  const y=(v)=>pad.top+h-((v-min)/(max-min))*h;
  const startVal=data[0].value;
  const yTicks=Array.from({length:5},(_,i)=>min+((max-min)*i)/4);
  const dateLabels=[];const startDate=new Date(2020,0,6);const step=Math.max(1,Math.floor(data.length/8));
  for(let i=0;i<data.length;i+=step){const d=new Date(startDate.getTime()+i*7*86400000);dateLabels.push({idx:i,label:d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"})});}
  let segments=[],segStart=0,curCol=C.green;
  for(let i=1;i<=data.length;i++){const nc=i<data.length?(data[i].value<startVal?C.red:C.green):curCol;if(nc!==curCol||i===data.length){const pts=[];for(let j=segStart;j<i;j++)pts.push(`${x(j)},${y(data[j].value)}`);if(i<data.length)pts.push(`${x(i)},${y(data[i].value)}`);segments.push({color:curCol,d:`M${pts.join(" L")}`});curCol=nc;segStart=i;}}
  return(<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
    {yTicks.map((v,i)=>{const yp=y(v);return(<g key={i}><line x1={pad.left} x2={width-pad.right} y1={yp} y2={yp} stroke={C.border}/><text x={pad.left-8} y={yp+4} textAnchor="end" fill={C.textDim} fontSize="11" fontFamily={F.mono}>£{Math.round(v/1000)}k</text></g>);})}
    {dateLabels.map((dl,i)=>(<text key={i} x={x(dl.idx)} y={height-8} textAnchor="middle" fill={C.textDim} fontSize="10" fontFamily={F.mono}>{dl.label}</text>))}
    <line x1={pad.left} x2={width-pad.right} y1={y(startVal)} y2={y(startVal)} stroke={C.textDim} strokeDasharray="4,4" opacity="0.4"/>
    {segments.map((s,i)=><path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>)}
    {soldWeek!==null&&(<><circle cx={x(soldWeek)} cy={y(data[soldWeek].value)} r="6" fill={C.red}/><text x={x(soldWeek)} y={y(data[soldWeek].value)-14} textAnchor="middle" fill={C.red} fontSize="12" fontFamily={F.mono} fontWeight="700">SOLD</text></>)}
  </svg>);
}

// ─── UI HELPERS ─────────────────────────────────────────
const TabBtn=({active,onClick,children,icon})=>(<button onClick={onClick} style={{display:"flex",alignItems:"center",gap:"6px",padding:"10px 12px",background:active?C.accentDim:"transparent",border:`1px solid ${active?C.accent:"transparent"}`,borderRadius:"10px",color:active?C.accent:C.textMuted,fontFamily:F.body,fontSize:"12px",fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap"}}><span style={{fontSize:"15px"}}>{icon}</span>{children}</button>);
const Stat=({label,value,sub,color})=>(<div style={{flex:1,minWidth:"120px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"14px"}}><div style={{fontFamily:F.mono,fontSize:"10px",color:C.textDim,marginBottom:"4px",textTransform:"uppercase"}}>{label}</div><div style={{fontFamily:F.mono,fontSize:"22px",fontWeight:700,color}}>{value}</div>{sub&&<div style={{fontFamily:F.mono,fontSize:"10px",color:C.textDim,marginTop:"2px"}}>{sub}</div>}</div>);
const Legend=({color,label})=>(<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"12px",height:"3px",borderRadius:"2px",background:color}}/><span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>{label}</span></div>);
const btn={padding:"14px 28px",background:C.accent,border:"none",borderRadius:"12px",color:"#0a0f1a",fontFamily:F.body,fontSize:"15px",fontWeight:700,cursor:"pointer"};
const sBtn={width:"32px",height:"32px",borderRadius:"8px",border:`1px solid ${C.border}`,background:C.card,color:C.text,fontFamily:F.mono,fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};
const chip={padding:"8px 14px",borderRadius:"8px",border:"1px solid",fontFamily:F.mono,fontSize:"13px",cursor:"pointer",background:C.card};

// ─── SETTINGS ──────────────────────────────────────────
function SettingsPanel({settings,setSettings}) {
  const fields=[{section:"Annual Returns (before fees)",items:[{key:"marketReturn",label:"Market (passive)",suffix:"%"},{key:"valueReturn",label:"Value factor",suffix:"%"},{key:"momentumReturn",label:"Momentum factor",suffix:"%"},{key:"qualityReturn",label:"Quality factor",suffix:"%"},{key:"smallCapReturn",label:"Small cap factor",suffix:"%"}]},{section:"Annual Fees (OCF)",items:[{key:"passiveFee",label:"Passive fund",suffix:"%"},{key:"factorFee",label:"Factor fund",suffix:"%"},{key:"activeFee",label:"Active fund",suffix:"%"}]},{section:"Other",items:[{key:"pizzaCost",label:"Pizza cost",suffix:"£",prefix:true},{key:"defaultGrowthRate",label:"Fee calc growth rate",suffix:"%"}]}];
  const handleChange=(key,val)=>{const num=parseFloat(val);if(!isNaN(num))setSettings(s=>({...s,[key]:num}));};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px"}}><div><h3 style={{fontFamily:F.display,color:C.text,fontSize:"24px",margin:"0 0 4px"}}>Workshop Settings</h3><p style={{color:C.textMuted,fontSize:"13px",margin:0}}>Only you (the presenter) can see and edit these.</p></div><button onClick={()=>setSettings({...DEFAULT_SETTINGS})} style={{...btn,background:C.card,color:C.textMuted,border:`1px solid ${C.border}`,fontSize:"12px",padding:"8px 14px"}}>Reset defaults</button></div>
    <div style={{background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"10px",padding:"12px 16px",marginBottom:"24px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px"}}>📊 Based on MSCI World factor index data (1975–2025) and typical UK fund fees.</span></div>
    {fields.map((section,si)=>(<div key={si} style={{marginBottom:"24px"}}><div style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"12px"}}>{section.section}</div><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{section.items.map(item=>(<div key={item.key} style={{display:"flex",alignItems:"center",gap:"12px",padding:"10px 16px",background:C.card,borderRadius:"10px",border:`1px solid ${C.border}`}}><span style={{flex:1,fontFamily:F.body,fontSize:"14px",color:C.text}}>{item.label}</span><div style={{display:"flex",alignItems:"center",gap:"4px"}}>{item.prefix&&<span style={{fontFamily:F.mono,fontSize:"14px",color:C.textDim}}>{item.suffix}</span>}<input type="number" step={item.key.includes("Fee")?"0.01":"0.1"} value={settings[item.key]} onChange={e=>handleChange(item.key,e.target.value)} style={{width:"80px",padding:"6px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.accent,fontFamily:F.mono,fontSize:"14px",textAlign:"right",outline:"none"}}/>{!item.prefix&&<span style={{fontFamily:F.mono,fontSize:"14px",color:C.textDim}}>{item.suffix}</span>}</div></div>))}</div></div>))}
  </div>);
}

// ═══════════════════════════════════════════════════════
// QUIZ PAGE — Firebase leaderboard (real-time!)
// ═══════════════════════════════════════════════════════
function QuizPage({userName,isPresenter}) {
  const [cur,setCur]=useState(0);const [sel,setSel]=useState(null);const [score,setScore]=useState(0);
  const [ans,setAns]=useState(false);const [done,setDone]=useState(false);
  const [submitted,setSubmitted]=useState(false);const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState(null);
  const [showBoard,setShowBoard]=useState(false);const [scores,setScores]=useState([]);
  const [loading,setLoading]=useState(false);const [pCount,setPCount]=useState(0);
  const q=quizQuestions[cur];
  const pick=(i)=>{if(ans)return;setSel(i);setAns(true);if(i===q.correct)setScore(s=>s+1);};
  const next=()=>{if(cur<quizQuestions.length-1){setCur(c=>c+1);setSel(null);setAns(false);}else setDone(true);};

  // Real-time listener for presenter — scores update automatically!
  useEffect(()=>{
    if(!isPresenter)return;
    const unsub=onScoresChanged((entries)=>{setPCount(entries.length);setScores(entries);});
    return()=>{if(typeof unsub==='function')unsub();};
  },[isPresenter]);

  const handleSubmit=async()=>{
    setSubmitting(true);setSubmitError(null);
    try{await submitQuizScore(userName,score,quizQuestions.length);setSubmitted(true);}
    catch(e){console.error("Submit error:",e);setSubmitError(e.message||"Failed to submit. Try again.");}
    setSubmitting(false);
  };
  const reveal=async()=>{setLoading(true);try{const e=await loadAllScores();setScores(e);setPCount(e.length);}catch(e){console.error(e);}setLoading(false);setShowBoard(true);};
  const handleClear=async()=>{try{await clearAllScores();}catch(e){console.error(e);}setScores([]);setPCount(0);setShowBoard(false);};
  const restart=()=>{setCur(0);setSel(null);setScore(0);setAns(false);setDone(false);setSubmitted(false);setSubmitError(null);};

  // SCOREBOARD
  if(showBoard&&isPresenter){
    const medals=["🥇","🥈","🥉"],mCol=[C.gold,C.silver,C.bronze];
    return(<div><div style={{textAlign:"center",marginBottom:"32px"}}><div style={{fontSize:"48px",marginBottom:"8px"}}>🏆</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"32px",margin:"0 0 4px"}}>Leaderboard</h2><p style={{color:C.textMuted,fontSize:"14px",margin:0}}>{scores.length} participant{scores.length!==1?"s":""}</p></div>
      {scores.length===0?<p style={{color:C.textMuted,textAlign:"center",padding:"40px 0"}}>No scores yet!</p>:(<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{scores.map((e,i)=>{const t3=i<3;return(<div key={i} style={{display:"flex",alignItems:"center",gap:"16px",padding:t3?"18px 20px":"14px 20px",background:t3?`${mCol[i]}12`:C.card,border:`1px solid ${t3?mCol[i]+"40":C.border}`,borderRadius:"12px"}}><div style={{width:"44px",height:"44px",borderRadius:"10px",background:t3?`${mCol[i]}20`:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:t3?"22px":"14px",fontFamily:F.mono,color:t3?mCol[i]:C.textDim,fontWeight:700}}>{t3?medals[i]:`#${i+1}`}</div><div style={{flex:1}}><div style={{fontFamily:F.body,fontWeight:600,color:C.text,fontSize:t3?"18px":"15px"}}>{e.name}</div><div style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>{Math.round((e.score/e.total)*100)}%</div></div><div style={{fontFamily:F.mono,fontSize:t3?"32px":"22px",fontWeight:700,color:t3?mCol[i]:C.accent}}>{e.score}/{e.total}</div></div>);})}</div>)}
      <div style={{display:"flex",gap:"12px",marginTop:"28px",justifyContent:"center",flexWrap:"wrap"}}><button onClick={()=>setShowBoard(false)} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`}}>← Back</button><button onClick={reveal} style={{...btn,background:C.accentDim,color:C.accent,border:`1px solid ${C.accent}`}}>↻ Refresh</button><button onClick={handleClear} style={{...btn,background:C.redDim,color:C.red,border:`1px solid ${C.red}`,fontSize:"13px",padding:"10px 18px"}}>Reset all</button></div></div>);
  }

  // RESULTS
  if(done){const pct=Math.round((score/quizQuestions.length)*100);return(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>{pct>=80?"🏆":pct>=50?"👍":"📚"}</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"32px",margin:"0 0 8px"}}>{score}/{quizQuestions.length}</h2><p style={{color:C.textMuted,fontSize:"16px",marginBottom:"32px"}}>{pct>=80?"Excellent!":pct>=50?"Good start!":"That's what this session is for!"}</p>
    {!isPresenter&&!submitted&&!submitError&&<button onClick={handleSubmit} disabled={submitting} style={{...btn,marginBottom:"12px",opacity:submitting?0.6:1}}>{submitting?"Submitting...":"Submit score to leaderboard"}</button>}
    {!isPresenter&&submitError&&<div style={{padding:"16px 20px",background:C.redDim,border:`1px solid ${C.red}`,borderRadius:"12px",marginBottom:"16px"}}><span style={{color:C.red,fontSize:"14px",display:"block",marginBottom:"8px"}}>⚠ {submitError}</span><button onClick={handleSubmit} disabled={submitting} style={{...btn,background:C.red,fontSize:"13px",padding:"8px 16px"}}>Try again</button></div>}
    {!isPresenter&&submitted&&<div style={{padding:"16px 20px",background:C.greenDim,border:`1px solid ${C.green}`,borderRadius:"12px",marginBottom:"16px",display:"inline-block"}}><span style={{color:C.green,fontSize:"15px"}}>✓ Submitted! Presenter will reveal the leaderboard.</span></div>}
    {isPresenter&&(<div style={{display:"flex",flexDirection:"column",gap:"12px",alignItems:"center"}}><div style={{padding:"12px 20px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"12px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"14px"}}>📊 {pCount} score{pCount!==1?"s":""} submitted (updates live!)</span></div><button onClick={reveal} style={{...btn,fontSize:"18px",padding:"18px 36px"}}>{loading?"Loading...":"🏆 Reveal Leaderboard"}</button></div>)}
    <div style={{marginTop:"16px"}}><button onClick={restart} style={{...btn,background:"transparent",color:C.textMuted,border:`1px solid ${C.border}`,fontSize:"13px",padding:"10px 20px"}}>Retake</button></div></div>);}

  // QUIZ FLOW
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"32px"}}><span style={{color:C.textDim,fontFamily:F.mono,fontSize:"13px"}}>Q{cur+1}/{quizQuestions.length}</span><span style={{color:C.accent,fontFamily:F.mono,fontSize:"13px"}}>SCORE: {score}</span></div>
    <div style={{display:"flex",gap:"6px",marginBottom:"32px"}}>{quizQuestions.map((_,i)=><div key={i} style={{flex:1,height:"4px",borderRadius:"2px",background:i<cur?C.accent:i===cur?C.accentDim:C.border}}/>)}</div>
    <h3 style={{fontFamily:F.display,color:C.text,fontSize:"24px",margin:"0 0 28px",lineHeight:1.3}}>{q.q}</h3>
    <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>{q.options.map((o,i)=>{let bg=C.card,bd=C.border;if(ans){if(i===q.correct){bg=C.greenDim;bd=C.green;}else if(i===sel){bg=C.redDim;bd=C.red;}}return(<button key={i} onClick={()=>pick(i)} style={{padding:"16px 20px",background:bg,border:`1px solid ${bd}`,borderRadius:"12px",color:C.text,fontFamily:F.body,fontSize:"15px",cursor:ans?"default":"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:"12px"}}><span style={{width:"28px",height:"28px",borderRadius:"8px",background:ans&&i===q.correct?C.green:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontFamily:F.mono,color:ans&&i===q.correct?"#000":C.textMuted,flexShrink:0}}>{String.fromCharCode(65+i)}</span>{o}</button>);})}</div>
    {ans&&<div style={{background:sel===q.correct?C.greenDim:C.amberDim,border:`1px solid ${sel===q.correct?C.green:C.amber}`,borderRadius:"12px",padding:"16px 20px",marginBottom:"20px"}}><strong style={{color:sel===q.correct?C.green:C.amber}}>{sel===q.correct?"Correct! ✓":"Not quite ✗"}</strong><p style={{color:C.text,margin:"8px 0 0",fontSize:"14px",lineHeight:1.5}}>{q.explanation}</p></div>}
    {ans&&<button onClick={next} style={btn}>{cur<quizQuestions.length-1?"Next →":"See results"}</button>}
    {isPresenter&&<div style={{marginTop:"24px",padding:"12px 16px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px"}}>🎙 {pCount} submitted (live)</span><button onClick={reveal} style={{...btn,fontSize:"13px",padding:"8px 16px"}}>Leaderboard</button></div>}
  </div>);
}

// ═══════════════════════════════════════════════════════
// JARGON BUSTER
// ═══════════════════════════════════════════════════════
function JargonPage() {
  const [idx,setIdx]=useState(0);const [revealed,setRevealed]=useState(false);const [done,setDone]=useState(false);
  const term=jargonTerms[idx];
  if(done)return(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>🎓</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 12px"}}>Jargon Busted!</h2><p style={{color:C.textMuted,fontSize:"15px",marginBottom:"32px"}}>{jargonTerms.length} terms covered.</p><button onClick={()=>{setIdx(0);setRevealed(false);setDone(false);}} style={btn}>Go again</button></div>);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"24px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>TERM {idx+1}/{jargonTerms.length}</span><span style={{fontFamily:F.mono,fontSize:"12px",color:C.purple,background:C.purpleDim,padding:"4px 10px",borderRadius:"6px"}}>{term.category}</span></div>
    <div style={{display:"flex",gap:"6px",marginBottom:"32px"}}>{jargonTerms.map((_,i)=><div key={i} style={{flex:1,height:"4px",borderRadius:"2px",background:i<idx?C.purple:i===idx?C.purpleDim:C.border}}/>)}</div>
    <div style={{background:`linear-gradient(135deg, ${C.card} 0%, #1a1a2e 100%)`,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"40px 32px",textAlign:"center",marginBottom:"24px",minHeight:"200px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,marginBottom:"12px",letterSpacing:"2px",textTransform:"uppercase"}}>{revealed?"In plain English":"What does this mean?"}</div>
      <h2 style={{fontFamily:F.display,fontSize:"42px",color:C.text,margin:"0 0 20px"}}>{term.term}</h2>
      {revealed?<p style={{color:C.text,fontSize:"17px",lineHeight:1.6,maxWidth:"500px",margin:0}}>{term.plain}</p>:<p style={{color:C.textDim,fontSize:"15px",fontStyle:"italic",margin:0}}>Ask the audience for their best guess…</p>}
    </div>
    <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
      {!revealed&&<button onClick={()=>setRevealed(true)} style={{...btn,fontSize:"16px",padding:"16px 32px"}}>Reveal definition</button>}
      {revealed&&<button onClick={()=>{if(idx<jargonTerms.length-1){setIdx(i=>i+1);setRevealed(false);}else setDone(true);}} style={{...btn,fontSize:"16px",padding:"16px 32px"}}>{idx<jargonTerms.length-1?"Next term →":"Finish"}</button>}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PORTFOLIO SIM
// ═══════════════════════════════════════════════════════
function PortfolioPage({settings:s}) {
  const fDefs={Market:{color:C.accent,desc:"Pure passive — tracks the whole market",fee:s.passiveFee,ret:s.marketReturn},Value:{color:C.green,desc:"Targets cheap, undervalued stocks",fee:s.factorFee,ret:s.valueReturn},Momentum:{color:C.amber,desc:"Rides stocks with recent strong performance",fee:s.factorFee,ret:s.momentumReturn},Quality:{color:C.purple,desc:"Focuses on profitable, stable companies",fee:s.factorFee,ret:s.qualityReturn},"Small Cap":{color:C.red,desc:"Invests in smaller companies for growth",fee:s.factorFee,ret:s.smallCapReturn}};
  const gData={Market:genGrowth(42,0.035,s.marketReturn),Value:genGrowth(99,0.04,s.valueReturn),Momentum:genGrowth(17,0.045,s.momentumReturn),Quality:genGrowth(73,0.032,s.qualityReturn),"Small Cap":genGrowth(55,0.05,s.smallCapReturn)};
  const [alloc,setAlloc]=useState({Market:60,Value:20,Momentum:10,Quality:10,"Small Cap":0});
  const [show,setShow]=useState(false);
  const total=Object.values(alloc).reduce((a,b)=>a+b,0);
  const adj=(f,d)=>{setAlloc({...alloc,[f]:Math.max(0,Math.min(100,alloc[f]+d))});setShow(false);};
  const blended=gData.Market.map((_,i)=>{let v=0;Object.keys(alloc).forEach(f=>v+=(alloc[f]/100)*gData[f][i].value);return{month:gData.Market[i].month,value:Math.round(v*100)/100};});
  const fee=Object.keys(alloc).reduce((a,f)=>a+(alloc[f]/100)*fDefs[f].fee,0);
  const fv=blended[blended.length-1]?.value||100;
  const ret=((fv-100)/100)*100;
  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"28px",lineHeight:1.5}}>Build your portfolio. Allocations should total 100%.</p>
    <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>{Object.keys(alloc).map(f=>(<div key={f} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`}}><div style={{width:"10px",height:"10px",borderRadius:"3px",background:fDefs[f].color,flexShrink:0}}/><div style={{flex:1}}><div style={{fontFamily:F.body,fontWeight:600,color:C.text,fontSize:"14px"}}>{f} <span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim,fontWeight:400}}>({fDefs[f].ret}% p.a.)</span></div><div style={{color:C.textDim,fontSize:"12px"}}>{fDefs[f].desc}</div></div><div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}><button onClick={()=>adj(f,-10)} style={sBtn}>−</button><span style={{fontFamily:F.mono,color:C.text,fontSize:"16px",width:"45px",textAlign:"center"}}>{alloc[f]}%</span><button onClick={()=>adj(f,10)} style={sBtn}>+</button></div></div>))}</div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:total===100?C.green:C.red}}>Total: {total}%{total!==100?" (needs 100%)":" ✓"}</span><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>Fee: {fee.toFixed(2)}%</span></div>
    <button onClick={()=>setShow(true)} disabled={total!==100} style={{...btn,opacity:total!==100?0.4:1}}>Simulate 20 years →</button>
    {show&&total===100&&(()=>{
      const mRets=[];for(let i=1;i<blended.length;i++)mRets.push((blended[i].value-blended[i-1].value)/blended[i-1].value);
      const avg=mRets.reduce((a,b)=>a+b,0)/mRets.length;
      const annVol=(Math.sqrt(mRets.reduce((a,r)=>a+Math.pow(r-avg,2),0)/(mRets.length-1))*Math.sqrt(12)*100).toFixed(1);
      const mkRets=[];for(let i=1;i<gData.Market.length;i++)mkRets.push((gData.Market[i].value-gData.Market[i-1].value)/gData.Market[i-1].value);
      const mkAvg=mkRets.reduce((a,b)=>a+b,0)/mkRets.length;
      const mkVol=(Math.sqrt(mkRets.reduce((a,r)=>a+Math.pow(r-mkAvg,2),0)/(mkRets.length-1))*Math.sqrt(12)*100).toFixed(1);
      return(<div style={{marginTop:"28px"}}><div style={{display:"flex",gap:"20px",marginBottom:"20px",flexWrap:"wrap"}}><Stat label="Final value" value={`£${Math.round(fv*100).toLocaleString()}`} sub="from £10,000" color={C.accent}/><Stat label="Total return" value={`${ret.toFixed(0)}%`} sub="over 20 years" color={C.green}/><Stat label="Blended fee" value={`${fee.toFixed(2)}%`} sub="per annum" color={C.amber}/><Stat label="Volatility" value={`${annVol}%`} sub={`vs ${mkVol}% passive`} color={C.purple}/></div><div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px"}}><BigChart datasets={[{data:blended,color:C.accent},{data:gData.Market,color:C.textDim}]}/><div style={{display:"flex",gap:"20px",marginTop:"12px",justifyContent:"center"}}><Legend color={C.accent} label="Your portfolio"/><Legend color={C.textDim} label="Pure passive"/></div></div></div>);
    })()}
  </div>);
}

// ═══════════════════════════════════════════════════════
// FEE CALCULATOR
// ═══════════════════════════════════════════════════════
function FeeCalcPage({settings:s}) {
  const [amt,setAmt]=useState(10000);const [yrs,setYrs]=useState(20);
  const fees=[{label:"Passive Index",rate:s.passiveFee,color:C.accent},{label:"Factor Fund",rate:s.factorFee,color:C.amber},{label:"Active Fund",rate:s.activeFee,color:C.red}];
  const gr=s.defaultGrowthRate/100;
  const calc=(init,fee,y)=>{let v=init;for(let i=0;i<y;i++)v*=1+gr-fee/100;return v;};
  const results=fees.map(f=>({...f,final:calc(amt,f.rate,yrs),lost:calc(amt,0,yrs)-calc(amt,f.rate,yrs)}));
  const mx=Math.max(...results.map(r=>r.final));
  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"28px",lineHeight:1.5}}>See how fees compound. Assumes {s.defaultGrowthRate}% annual return before fees.</p>
    <div style={{display:"flex",gap:"16px",marginBottom:"32px",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>INVESTMENT</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[5000,10000,25000,50000,100000].map(v=><button key={v} onClick={()=>setAmt(v)} style={{...chip,background:amt===v?C.accentDim:C.card,borderColor:amt===v?C.accent:C.border,color:amt===v?C.accent:C.textMuted}}>£{v.toLocaleString()}</button>)}</div></div>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>YEARS</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[10,20,30,40].map(v=><button key={v} onClick={()=>setYrs(v)} style={{...chip,background:yrs===v?C.accentDim:C.card,borderColor:yrs===v?C.accent:C.border,color:yrs===v?C.accent:C.textMuted}}>{v}y</button>)}</div></div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>{results.map((r,i)=>(<div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"12px"}}><div><span style={{fontFamily:F.body,fontWeight:600,color:C.text}}>{r.label}</span><span style={{fontFamily:F.mono,color:C.textDim,fontSize:"13px",marginLeft:"10px"}}>{r.rate}%</span></div><span style={{fontFamily:F.mono,color:r.color,fontSize:"22px",fontWeight:700}}>£{Math.round(r.final).toLocaleString()}</span></div><div style={{height:"8px",background:C.border,borderRadius:"4px",overflow:"hidden",marginBottom:"8px"}}><div style={{height:"100%",width:`${(r.final/mx)*100}%`,background:r.color,borderRadius:"4px",transition:"width 0.5s"}}/></div><div style={{fontFamily:F.mono,color:C.red,fontSize:"13px"}}>💸 £{Math.round(r.lost).toLocaleString()} lost to fees</div></div>))}</div>
    <div style={{marginTop:"24px",padding:"16px 20px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"12px"}}><p style={{color:C.text,fontSize:"14px",margin:0,lineHeight:1.5}}><strong style={{color:C.amber}}>Key takeaway:</strong> Passive vs active on £{amt.toLocaleString()} over {yrs} years = <strong>£{Math.round(results[2].lost-results[0].lost).toLocaleString()}</strong> difference.</p></div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PIZZA TEST
// ═══════════════════════════════════════════════════════
function PizzaPage({settings:s}) {
  const [amount,setAmount]=useState(50000);const [years,setYears]=useState(30);
  const pc=s.pizzaCost;
  const feeTypes=[{label:"Passive Index",rate:s.passiveFee,color:C.accent,emoji:"📈"},{label:"Factor Fund",rate:s.factorFee,color:C.amber,emoji:"⚡"},{label:"Active Fund",rate:s.activeFee,color:C.red,emoji:"👔"}];
  const gr=s.defaultGrowthRate/100;
  const calcFees=(p,r,y)=>{let total=0,v=p;for(let i=0;i<y;i++){const fee=v*(r/100);total+=fee;v=v*(1+gr)-fee;}return total;};
  const results=feeTypes.map(f=>{const tf=calcFees(amount,f.rate,years);return{...f,totalFees:tf,pizzas:Math.round(tf/pc),pizzasPerWeek:(Math.round(tf/pc)/(years*52)).toFixed(1)};});
  const feeDiff=results[2].totalFees-results[0].totalFees;
  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"12px",lineHeight:1.5}}>Fees are hard to feel as percentages. Let's convert them into pizzas. 🍕</p>
    <div style={{background:C.purpleDim,border:`1px solid ${C.purple}40`,borderRadius:"10px",padding:"12px 16px",marginBottom:"28px"}}><span style={{color:C.text,fontFamily:F.body,fontSize:"13px"}}>🍕 We're using <strong style={{color:C.purple}}>£{pc.toFixed(2)}</strong> per pizza — roughly what a decent takeaway Margherita costs in the UK.</span></div>
    <div style={{display:"flex",gap:"16px",marginBottom:"32px",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>PORTFOLIO VALUE</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[25000,50000,100000,250000,500000].map(v=><button key={v} onClick={()=>setAmount(v)} style={{...chip,background:amount===v?C.accentDim:C.card,borderColor:amount===v?C.accent:C.border,color:amount===v?C.accent:C.textMuted}}>£{(v/1000)}k</button>)}</div></div>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>YEARS INVESTED</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[10,20,30,40].map(v=><button key={v} onClick={()=>setYears(v)} style={{...chip,background:years===v?C.accentDim:C.card,borderColor:years===v?C.accent:C.border,color:years===v?C.accent:C.textMuted}}>{v}y</button>)}</div></div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"16px",marginBottom:"24px"}}>{results.map((r,i)=>(<div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}><div><span style={{fontSize:"18px",marginRight:"8px"}}>{r.emoji}</span><span style={{fontFamily:F.body,fontWeight:600,color:C.text,fontSize:"16px"}}>{r.label}</span><span style={{fontFamily:F.mono,color:C.textDim,fontSize:"13px",marginLeft:"8px"}}>{r.rate}%</span></div><span style={{fontFamily:F.mono,color:r.color,fontSize:"18px",fontWeight:700}}>£{Math.round(r.totalFees).toLocaleString()}</span></div><div style={{display:"flex",alignItems:"center",gap:"12px"}}><div style={{fontSize:"32px"}}>🍕</div><div><div style={{fontFamily:F.mono,color:C.text,fontSize:"20px",fontWeight:700}}>{r.pizzas.toLocaleString()} pizzas</div><div style={{fontFamily:F.mono,color:C.textDim,fontSize:"13px"}}>{r.pizzasPerWeek} pizzas every week for {years} years</div></div></div></div>))}</div>
    <div style={{background:`linear-gradient(135deg, ${C.redDim} 0%, rgba(248,113,113,0.05) 100%)`,border:`1px solid ${C.red}40`,borderRadius:"16px",padding:"24px",textAlign:"center"}}><p style={{color:C.text,fontSize:"16px",margin:"0 0 8px"}}>Switching from active to passive saves you</p><div style={{fontFamily:F.mono,color:C.red,fontSize:"36px",fontWeight:700,marginBottom:"8px"}}>£{Math.round(feeDiff).toLocaleString()}</div><p style={{color:C.textMuted,fontSize:"15px",margin:0}}>That's <strong style={{color:C.amber}}>{Math.round(feeDiff/pc).toLocaleString()} fewer pizzas</strong> going to your fund manager 🍕</p></div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PICK THE FUND
// ═══════════════════════════════════════════════════════
function PickFundPage({settings:s}) {
  const [round,setRound]=useState(0);const [guess,setGuess]=useState(null);const [score,setScore]=useState(0);const [done,setDone]=useState(false);
  const pair=fundPairs[round];
  const getReturn=(type)=>type.includes("Passive")?s.marketReturn:type.includes("Value")?s.valueReturn:type.includes("Momentum")?s.momentumReturn:s.qualityReturn;
  const aData=genGrowth(pair.aSeed,pair.aVol,getReturn(pair.aType));
  const bData=genGrowth(pair.bSeed,pair.bVol,getReturn(pair.bType));
  const pick=(w)=>{setGuess(w);if((w==="a"&&pair.aType.includes("Passive"))||(w==="b"&&pair.bType.includes("Passive")))setScore(s=>s+1);};
  const next=()=>{if(round<fundPairs.length-1){setRound(r=>r+1);setGuess(null);}else setDone(true);};
  const restart=()=>{setRound(0);setGuess(null);setScore(0);setDone(false);};
  if(done)return(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>{score===fundPairs.length?"🎯":"🤔"}</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 8px"}}>{score}/{fundPairs.length} right</h2><p style={{color:C.textMuted,fontSize:"15px",marginBottom:"32px"}}>{score===fundPairs.length?"Perfect!":"Surprisingly tricky — that's the point!"}</p><button onClick={restart} style={btn}>Play again</button></div>);
  const funds={a:{data:aData,label:"Fund A",type:pair.aType},b:{data:bData,label:"Fund B",type:pair.bType}};
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"24px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>ROUND {round+1}/{fundPairs.length}</span><span style={{fontFamily:F.mono,fontSize:"13px",color:C.accent}}>SCORE: {score}</span></div>
    <h3 style={{fontFamily:F.display,color:C.text,fontSize:"22px",margin:"0 0 8px"}}>Which is the passive fund?</h3>
    <p style={{color:C.textMuted,fontSize:"13px",marginBottom:"24px"}}>Hint: look at how smooth or jagged the line is — that's the volatility.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"24px"}}>{["a","b"].map(k=>{const f=funds[k];let bd=C.border,bg=C.card;if(guess){if(f.type.includes("Passive")){bd=C.green;bg=C.greenDim;}else{bd=C.amber;bg=C.amberDim;}}
      const rets=[];for(let i=1;i<f.data.length;i++)rets.push((f.data[i].value-f.data[i-1].value)/f.data[i-1].value);
      const avg=rets.reduce((s,r)=>s+r,0)/rets.length;
      const vol=(Math.sqrt(rets.reduce((s,r)=>s+Math.pow(r-avg,2),0)/(rets.length-1))*Math.sqrt(12)*100).toFixed(1);
      return(<div key={k} onClick={()=>!guess&&pick(k)} style={{background:bg,border:`2px solid ${bd}`,borderRadius:"12px",padding:"20px",cursor:guess?"default":"pointer"}}>
        <div style={{fontFamily:F.mono,color:C.textMuted,fontSize:"13px",marginBottom:"12px"}}>{f.label}{guess&&<span style={{color:f.type.includes("Passive")?C.green:C.amber,marginLeft:"8px",fontWeight:600}}>— {f.type}</span>}</div>
        <MiniChart data={f.data} color={guess?(f.type.includes("Passive")?C.green:C.amber):C.accent} width={300} height={140}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"10px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.text}}>Final: {Math.round(f.data[f.data.length-1].value)}</span>{guess&&<span style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>Vol: {vol}%</span>}</div>
      </div>);})}</div>
    {guess&&<><div style={{background:C.accentDim,border:`1px solid ${C.accent}`,borderRadius:"12px",padding:"16px 20px",marginBottom:"20px"}}><p style={{color:C.text,fontSize:"14px",margin:0,lineHeight:1.5}}><strong style={{color:C.accent}}>Insight:</strong> {pair.insight}</p></div><button onClick={next} style={btn}>{round<fundPairs.length-1?"Next →":"Results"}</button></>}
  </div>);
}

// ═══════════════════════════════════════════════════════
// DO NOTHING CHALLENGE (COVID CRASH)
// ═══════════════════════════════════════════════════════
function DoNothingPage() {
  const [phase,setPhase]=useState("intro");const [weekIdx,setWeekIdx]=useState(0);
  const [decisions,setDecisions]=useState([]);const [soldWeek,setSoldWeek]=useState(null);
  const [speed,setSpeed]=useState(200);const [paused,setPaused]=useState(false);
  const timerRef=useRef(null);
  const weeks=covidData.weeks;const decisionWeeks=covidData.decisionWeeks;
  const currentData=weeks.slice(0,weekIdx+1);
  const currentVal=weeks[weekIdx]?.value||100000;const startVal=100000;
  const change=((currentVal-startVal)/startVal*100).toFixed(1);
  const isDecisionPoint=decisionWeeks.includes(weekIdx)&&!decisions.find(d=>d.week===weekIdx);
  const headline=weeks[weekIdx]?.headline;
  const getDateLabel=(w)=>{const d=new Date(new Date(2020,0,6).getTime()+w*7*86400000);return d.toLocaleDateString("en-GB",{month:"short",year:"numeric"});};
  const startSim=()=>{setPhase("playing");setWeekIdx(0);setDecisions([]);setSoldWeek(null);setPaused(false);};
  useEffect(()=>{if(phase!=="playing"||paused||isDecisionPoint)return;timerRef.current=setTimeout(()=>{if(weekIdx<weeks.length-1)setWeekIdx(w=>w+1);else setPhase("held");},speed);return()=>clearTimeout(timerRef.current);},[weekIdx,phase,paused,isDecisionPoint,speed]);
  const decide=(choice)=>{setDecisions(d=>[...d,{week:weekIdx,choice,value:currentVal}]);if(choice==="sell"){setSoldWeek(weekIdx);setPhase("sold");}};
  const restart=()=>{setPhase("intro");setWeekIdx(0);setDecisions([]);setSoldWeek(null);};

  if(phase==="intro")return(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>😰</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 12px"}}>The "Do Nothing" Challenge</h2><p style={{color:C.textMuted,fontSize:"15px",maxWidth:"500px",margin:"0 auto 12px",lineHeight:1.6}}>It's <strong style={{color:C.accent}}>January 2020</strong>. You've invested <strong style={{color:C.accent}}>£100,000</strong> in a global passive fund tracking the <strong style={{color:C.accent}}>MSCI ACWI</strong>.</p><p style={{color:C.textMuted,fontSize:"15px",maxWidth:"500px",margin:"0 auto 12px",lineHeight:1.6}}>You're about to live through the <strong style={{color:C.red}}>COVID-19 crash</strong> week by week. At key moments: <strong style={{color:C.amber}}>sell or hold?</strong></p><p style={{color:C.textDim,fontSize:"13px",maxWidth:"500px",margin:"0 auto 32px"}}>Based on actual MSCI ACWI performance. The index fell 34% peak to trough in 5 weeks.</p><button onClick={startSim} style={{...btn,fontSize:"18px",padding:"18px 40px"}}>Start →</button></div>);

  if(phase==="sold"){const sv=weeks[soldWeek].value;const fv=weeks[weeks.length-1].value;const loss=fv-sv;return(<div><div style={{textAlign:"center",marginBottom:"24px"}}><div style={{fontSize:"48px",marginBottom:"8px"}}>😱</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 8px"}}>You sold at {getDateLabel(soldWeek)}!</h2></div><div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px",marginBottom:"24px"}}><CrashChart data={weeks} soldWeek={soldWeek}/></div><div style={{display:"flex",gap:"16px",marginBottom:"24px",flexWrap:"wrap"}}><Stat label="Sold at" value={`£${sv.toLocaleString()}`} sub={`${((sv-startVal)/startVal*100).toFixed(1)}%`} color={C.red}/><Stat label="If held to mid-2021" value={`£${fv.toLocaleString()}`} sub={`+${((fv-startVal)/startVal*100).toFixed(1)}%`} color={C.green}/><Stat label="Cost of panic" value={`£${Math.round(loss).toLocaleString()}`} sub="left on the table" color={C.amber}/></div><div style={{background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"12px",padding:"20px",marginBottom:"20px"}}><p style={{color:C.text,fontSize:"15px",margin:0,lineHeight:1.6}}><strong style={{color:C.amber}}>The lesson:</strong> Selling during the COVID crash locked in losses. MSCI ACWI recovered to pre-crash levels by September 2020 — just 5 months — and hit new highs by year end.</p></div><button onClick={restart} style={btn}>Try again</button></div>);}

  if(phase==="held"){const fv=weeks[weeks.length-1].value;const lowest=Math.min(...weeks.map(d=>d.value));return(<div><div style={{textAlign:"center",marginBottom:"24px"}}><div style={{fontSize:"48px",marginBottom:"8px"}}>💎</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 8px"}}>Diamond hands! You held through COVID.</h2></div><div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px",marginBottom:"24px"}}><CrashChart data={weeks} soldWeek={null}/></div><div style={{display:"flex",gap:"16px",marginBottom:"24px",flexWrap:"wrap"}}><Stat label="Started" value="£100,000" sub="Jan 2020" color={C.textMuted}/><Stat label="Lowest" value={`£${lowest.toLocaleString()}`} sub={`${((lowest-startVal)/startVal*100).toFixed(1)}%`} color={C.red}/><Stat label="By mid-2021" value={`£${fv.toLocaleString()}`} sub={`+${((fv-startVal)/startVal*100).toFixed(1)}%`} color={C.green}/></div><div style={{background:C.greenDim,border:`1px solid ${C.green}`,borderRadius:"12px",padding:"20px",marginBottom:"20px"}}><p style={{color:C.text,fontSize:"15px",margin:0,lineHeight:1.6}}><strong style={{color:C.green}}>Congratulations!</strong> You held through a 34% crash. MSCI ACWI fully recovered within 5 months. Time in the market beats timing the market.</p></div><button onClick={restart} style={btn}>Run again</button></div>);}

  // PLAYING
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>{getDateLabel(weekIdx)} — Week {weekIdx+1}/{weeks.length}</span><div style={{display:"flex",gap:"8px",alignItems:"center"}}><span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>SPEED:</span>{[{l:"1x",v:300},{l:"2x",v:150},{l:"4x",v:75}].map(sp=><button key={sp.l} onClick={()=>setSpeed(sp.v)} style={{...chip,padding:"4px 10px",fontSize:"11px",background:speed===sp.v?C.accentDim:C.card,borderColor:speed===sp.v?C.accent:C.border,color:speed===sp.v?C.accent:C.textMuted}}>{sp.l}</button>)}</div></div>
    <div style={{display:"flex",gap:"20px",marginBottom:"20px",flexWrap:"wrap"}}><Stat label="Portfolio" value={`£${currentVal.toLocaleString()}`} color={currentVal>=startVal?C.green:C.red}/><Stat label="Change" value={`${parseFloat(change)>0?"+":""}${change}%`} color={parseFloat(change)>=0?C.green:C.red}/></div>
    <div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"16px",marginBottom:"16px"}}><CrashChart data={currentData} soldWeek={null}/></div>
    {headline&&(<div style={{padding:"12px 16px",background:headline.startsWith("🔴")?C.redDim:headline.startsWith("✅")?C.greenDim:C.amberDim,border:`1px solid ${headline.startsWith("🔴")?C.red+"40":headline.startsWith("✅")?C.green+"40":C.amber+"40"}`,borderRadius:"10px",marginBottom:"16px"}}><span style={{color:C.text,fontFamily:F.body,fontSize:"14px"}}>{headline}</span></div>)}
    {isDecisionPoint?(<div style={{background:`linear-gradient(135deg, ${C.amberDim} 0%, rgba(251,191,36,0.05) 100%)`,border:`2px solid ${C.amber}`,borderRadius:"16px",padding:"28px",textAlign:"center"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>⚠️</div><h3 style={{fontFamily:F.display,color:C.amber,fontSize:"22px",margin:"0 0 8px"}}>Decision time — {getDateLabel(weekIdx)}</h3><p style={{color:C.text,fontSize:"15px",marginBottom:"20px"}}>Portfolio {parseFloat(change)<0?"down":"up"} <strong>{Math.abs(parseFloat(change))}%</strong>.</p><div style={{display:"flex",gap:"16px",justifyContent:"center"}}><button onClick={()=>decide("sell")} style={{...btn,background:C.red,fontSize:"16px",padding:"16px 32px"}}>😰 Sell</button><button onClick={()=>decide("hold")} style={{...btn,background:C.green,fontSize:"16px",padding:"16px 32px"}}>💎 Hold</button></div></div>):(<div style={{textAlign:"center"}}><button onClick={()=>setPaused(!paused)} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`,fontSize:"13px",padding:"10px 20px"}}>{paused?"▶ Resume":"⏸ Pause"}</button></div>)}
  </div>);
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
const tabs=[{id:"quiz",label:"Quiz",icon:"❓"},{id:"jargon",label:"Jargon",icon:"🎓"},{id:"portfolio",label:"Portfolio",icon:"📊"},{id:"fees",label:"Fees",icon:"💰"},{id:"pizza",label:"Pizza",icon:"🍕"},{id:"pick",label:"Pick Fund",icon:"🎯"},{id:"donothing",label:"Do Nothing",icon:"😰"}];
const presenterTabs=[...tabs,{id:"settings",label:"Settings",icon:"⚙️"}];

export default function App() {
  const [screen,setScreen]=useState("join");
  const [userName,setUserName]=useState("");
  const [isPresenter,setIsPresenter]=useState(false);
  const [activeTab,setActiveTab]=useState("quiz");
  const [settings,setSettings]=useState({...DEFAULT_SETTINGS});
  const join=()=>{if(userName.trim())setScreen("main");};
  const activeTabs=isPresenter?presenterTabs:tabs;

  if(screen==="join")return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.body}}>
      <div style={{maxWidth:"440px",width:"100%",padding:"24px"}}>
        <div style={{textAlign:"center",marginBottom:"48px"}}><div style={{fontFamily:F.mono,fontSize:"12px",color:C.accent,letterSpacing:"3px",marginBottom:"16px",textTransform:"uppercase"}}>Interactive Workshop</div><h1 style={{fontFamily:F.display,fontSize:"36px",margin:"0 0 12px",color:C.text,lineHeight:1.2}}>Passive vs Factor<br/>Investing</h1><p style={{color:C.textMuted,fontSize:"15px",margin:0}}>Join the session to participate</p></div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"32px"}}>
          <label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"1px"}}>Your name</label>
          <input type="text" value={userName} onChange={e=>setUserName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&join()} placeholder="Enter your name…" autoFocus style={{width:"100%",padding:"14px 16px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,fontFamily:F.body,fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"20px"}}/>
          <label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>I am the…</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"24px"}}>
            <button onClick={()=>setIsPresenter(true)} style={{padding:"16px",borderRadius:"12px",cursor:"pointer",background:isPresenter?C.amberDim:C.bg,border:`1px solid ${isPresenter?C.amber:C.border}`,color:isPresenter?C.amber:C.textMuted,fontFamily:F.body,fontSize:"14px",fontWeight:600}}><div style={{fontSize:"24px",marginBottom:"6px"}}>🎙</div>Presenter</button>
            <button onClick={()=>setIsPresenter(false)} style={{padding:"16px",borderRadius:"12px",cursor:"pointer",background:!isPresenter?C.accentDim:C.bg,border:`1px solid ${!isPresenter?C.accent:C.border}`,color:!isPresenter?C.accent:C.textMuted,fontFamily:F.body,fontSize:"14px",fontWeight:600}}><div style={{fontSize:"24px",marginBottom:"6px"}}>👋</div>Participant</button>
          </div>
          <button onClick={join} disabled={!userName.trim()} style={{...btn,width:"100%",opacity:userName.trim()?1:0.4,fontSize:"16px",padding:"16px"}}>{isPresenter?"Start presenting":"Join session"} →</button>
        </div>
        <p style={{textAlign:"center",marginTop:"20px",fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>Quiz scores submit to the live leaderboard automatically</p>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F.body}}>
      <div style={{maxWidth:"960px",margin:"0 auto",padding:"32px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px",flexWrap:"wrap",gap:"12px"}}>
          <div><div style={{fontFamily:F.mono,fontSize:"12px",color:C.accent,letterSpacing:"3px",marginBottom:"4px",textTransform:"uppercase"}}>Interactive Workshop</div><h1 style={{fontFamily:F.display,fontSize:"26px",margin:0,color:C.text}}>Passive vs Factor Investing</h1></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:F.mono,fontSize:"12px",color:isPresenter?C.amber:C.accent,marginBottom:"2px"}}>{isPresenter?"🎙 PRESENTER":"👋 PARTICIPANT"}</div><div style={{fontFamily:F.body,fontSize:"14px",color:C.text}}>{userName}</div></div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"32px",overflowX:"auto",paddingBottom:"4px"}}>{activeTabs.map(t=><TabBtn key={t.id} active={activeTab===t.id} onClick={()=>setActiveTab(t.id)} icon={t.icon}>{t.label}</TabBtn>)}</div>
        <div style={{background:`linear-gradient(135deg, ${C.card} 0%, rgba(17,24,39,0.6) 100%)`,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"32px"}}>
          {activeTab==="quiz"&&<QuizPage userName={userName} isPresenter={isPresenter}/>}
          {activeTab==="jargon"&&<JargonPage/>}
          {activeTab==="portfolio"&&<PortfolioPage settings={settings}/>}
          {activeTab==="fees"&&<FeeCalcPage settings={settings}/>}
          {activeTab==="pizza"&&<PizzaPage settings={settings}/>}
          {activeTab==="pick"&&<PickFundPage settings={settings}/>}
          {activeTab==="donothing"&&<DoNothingPage/>}
          {activeTab==="settings"&&isPresenter&&<SettingsPanel settings={settings} setSettings={setSettings}/>}
        </div>
        <div style={{textAlign:"center",marginTop:"24px",fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>Simulated data for educational purposes only — not financial advice. Returns based on MSCI factor index research (1975–2025).</div>
      </div>
    </div>
  );
}
