"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: "", role: "patient", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const { data, error: signError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password
    });
    if (signError) { setError(signError.message); setLoading(false); return; }
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: form.full_name,
        role: form.role
      });
      if (profileError) { setError(profileError.message); setLoading(false); return; }
    }
    setMessage("Signup successful. Check your email for confirmation if enabled.");
    router.push("/login");
  }

  return (
    <>
      <style>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-12px) rotate(3deg)} }
        @keyframes float-med  { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-7px) rotate(-2deg)} }
        @keyframes pulse-ring { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.04)} }
        @keyframes ecg-draw   { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
        @keyframes glow-dot   { 0%,100%{opacity:0.4;r:3} 50%{opacity:1;r:5} }
        @keyframes drift      { 0%{transform:translate(0,0)} 33%{transform:translate(6px,-4px)} 66%{transform:translate(-4px,6px)} 100%{transform:translate(0,0)} }
        .anim-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .anim-float-med  { animation: float-med  4.5s ease-in-out infinite; }
        .anim-pulse-ring { animation: pulse-ring 3s ease-in-out infinite; }
        .anim-ecg        { stroke-dasharray:600; animation: ecg-draw 3s ease-out forwards; }
        .anim-drift      { animation: drift 8s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen flex">

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #060d1a 0%, #0a1f3c 40%, #093028 80%, #041610 100%)" }}
        >

          {/* Layer 1 — hex grid */}
          <div className="absolute inset-0" style={{ opacity: 0.07 }}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="hex" x="0" y="0" width="60" height="104" patternUnits="userSpaceOnUse">
                  <polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="white" strokeWidth="0.8"/>
                  <polygon points="30,54 58,69 58,99 30,114 2,99 2,69" fill="none" stroke="white" strokeWidth="0.8"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex)"/>
            </svg>
          </div>

          {/* Layer 2 — large atom/cell rings top-right */}
          <div className="absolute -top-24 -right-24 anim-pulse-ring" style={{ opacity: 0.12 }}>
            <svg width="420" height="420" viewBox="0 0 420 420" fill="none">
              <circle cx="210" cy="210" r="200" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="160" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="120" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="80"  stroke="#14b8a6" strokeWidth="1.2"/>
              <circle cx="210" cy="210" r="40"  stroke="#14b8a6" strokeWidth="1.2" fill="rgba(20,184,166,0.05)"/>
              {/* Orbiting dots */}
              {[0,60,120,180,240,300].map(deg => {
                const r = 160, rad = deg * Math.PI / 180;
                return <circle key={deg} cx={210 + r*Math.cos(rad)} cy={210 + r*Math.sin(rad)} r="4" fill="#14b8a6" opacity="0.6"/>;
              })}
              {[0,45,90,135,180,225,270,315].map(deg => {
                const r = 200, rad = deg * Math.PI / 180;
                return <circle key={deg} cx={210 + r*Math.cos(rad)} cy={210 + r*Math.sin(rad)} r="2.5" fill="#0f766e" opacity="0.5"/>;
              })}
            </svg>
          </div>

          {/* Layer 3 — molecular network bottom-left */}
          <div className="absolute -bottom-16 -left-12" style={{ opacity: 0.13 }}>
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
              {/* bonds */}
              {[
                [60,240,140,200],[140,200,200,240],[200,240,260,200],
                [140,200,160,140],[160,140,220,120],[160,140,100,110],
                [100,110,60,140],[60,140,60,240],[100,110,140,60],
                [140,60,220,80],[220,80,220,120]
              ].map(([x1,y1,x2,y2],i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14b8a6" strokeWidth="1.2"/>
              ))}
              {/* atoms */}
              {[
                [60,240,5],[140,200,8],[200,240,4],[260,200,5],
                [160,140,9],[220,120,5],[100,110,6],[60,140,4],
                [140,60,7],[220,80,4]
              ].map(([cx,cy,r],i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="#14b8a6" opacity="0.7"/>
              ))}
            </svg>
          </div>

          {/* Layer 4 — floating crosses scattered */}
          {[
            { top:"18%", left:"70%", size:18, delay:"0s"  },
            { top:"55%", left:"80%", size:12, delay:"1.2s"},
            { top:"72%", left:"55%", size:10, delay:"0.6s"},
            { top:"30%", left:"15%", size:14, delay:"1.8s"},
          ].map(({top,left,size,delay},i) => (
            <div key={i} className="absolute anim-float-med" style={{top,left,animationDelay:delay,opacity:0.15}}>
              <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
                <rect x="8" y="0" width="4" height="20" rx="2" fill="white"/>
                <rect x="0" y="8" width="20" height="4" rx="2" fill="white"/>
              </svg>
            </div>
          ))}

          {/* Layer 5 — floating glowing orbs */}
          {[
            {top:"22%",left:"60%",w:80,c:"#14b8a6"},
            {top:"65%",left:"72%",w:50,c:"#0f766e"},
            {top:"45%",left:"10%",w:60,c:"#0ea5e9"},
          ].map(({top,left,w,c},i) => (
            <div key={i} className="absolute rounded-full anim-pulse-ring"
              style={{top,left,width:w,height:w,background:`radial-gradient(circle,${c}22 0%,transparent 70%)`,animationDelay:`${i*1.1}s`}}/>
          ))}

          {/* Layer 6 — ECG line across the middle */}
          <div className="absolute left-0 right-0" style={{ top:"52%", opacity:0.25 }}>
            <svg width="100%" height="60" viewBox="0 0 600 60" preserveAspectRatio="none">
              <path
                className="anim-ecg"
                d="M0 30 L60 30 L80 30 L90 8 L100 52 L112 14 L122 44 L134 30 L180 30 L200 30 L210 8 L220 52 L232 14 L242 44 L254 30 L300 30 L320 30 L330 8 L340 52 L352 14 L362 44 L374 30 L420 30 L440 30 L450 8 L460 52 L472 14 L482 44 L494 30 L600 30"
                stroke="#14b8a6" strokeWidth="1.5" fill="none"
              />
            </svg>
          </div>

          {/* Layer 7 — cell structures mid-right */}
          <div className="absolute anim-float-slow" style={{top:"35%",right:"-20px",opacity:0.12}}>
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
              <ellipse cx="80" cy="80" rx="75" ry="55" stroke="#14b8a6" strokeWidth="1.5"/>
              <ellipse cx="80" cy="80" rx="55" ry="38" stroke="#0f766e" strokeWidth="1" strokeDasharray="4 3"/>
              <ellipse cx="80" cy="80" rx="22" ry="18" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" strokeWidth="1.5"/>
              <circle cx="80" cy="80" r="7" fill="#14b8a6" opacity="0.6"/>
              {[0,72,144,216,288].map(d=>{const rad=d*Math.PI/180;return(
                <circle key={d} cx={80+52*Math.cos(rad)} cy={80+35*Math.sin(rad)} r="3" fill="#0f766e" opacity="0.5"/>
              )})}
            </svg>
          </div>

          {/* ── Content ── */}
          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:"rgba(20,184,166,0.15)",border:"1px solid rgba(20,184,166,0.4)"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#14b8a6"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#14b8a6" opacity="0.4"/>
                <path d="M12 6v2M12 16v2M6 12H4M20 12h-2" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">OncoLens</span>
          </div>

          {/* Center */}
          <div className="relative z-10 space-y-7">
            {/* DNA helix — larger, more detailed */}
            <div className="anim-float-slow">
              <svg width="140" height="190" viewBox="0 0 140 190" fill="none">
                <defs>
                  <linearGradient id="strand1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6"/>
                    <stop offset="100%" stopColor="#0284c7"/>
                  </linearGradient>
                  <linearGradient id="strand2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e"/>
                    <stop offset="100%" stopColor="#0f3460"/>
                  </linearGradient>
                </defs>
                <path d="M35 5 Q70 28 105 52 Q70 76 35 100 Q70 124 105 148 Q70 172 35 196" stroke="url(#strand1)" strokeWidth="3" fill="none"/>
                <path d="M105 5 Q70 28 35 52 Q70 76 105 100 Q70 124 35 148 Q70 172 105 196" stroke="url(#strand2)" strokeWidth="3" fill="none"/>
                {[5,25,45,65,85,105,130,155].map((y,i)=>{
                  const pct = y/190;
                  const wave = Math.sin(pct * Math.PI * 2);
                  const x1 = 70 + wave * 35;
                  const x2 = 70 - wave * 35;
                  const colors = ["#a78bfa","#34d399","#60a5fa","#f472b6","#14b8a6","#a78bfa","#34d399","#60a5fa"];
                  return (
                    <g key={y}>
                      <line x1={x1} y1={y+5} x2={x2} y2={y+5} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2"/>
                      <circle cx={x1} cy={y+5} r="4.5" fill={colors[i]} opacity="0.9"/>
                      <circle cx={x2} cy={y+5} r="4.5" fill={colors[(i+4)%8]} opacity="0.9"/>
                      <circle cx={x1} cy={y+5} r="7" stroke={colors[i]} strokeWidth="0.8" fill="none" opacity="0.3"/>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Precision oncology<br/>
                <span style={{color:"#14b8a6"}}>starts here.</span>
              </h2>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xs">
                AI-powered cancer screening triage, real-time clinician collaboration, and longitudinal patient tracking — all in one platform.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {val:"10k+",  label:"Patients"},
                {val:"500+",  label:"Oncologists"},
                {val:"99.9%", label:"Uptime"},
              ].map(({val,label})=>(
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div className="text-lg font-bold" style={{color:"#14b8a6"}}>{val}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Feature list with SVG icons */}
            <div className="space-y-2.5">
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>, text:"AI-assisted imaging & pathology analysis" },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, text:"Real-time biomarker & vitals tracking" },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, text:"Multi-disciplinary tumor board collaboration" },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, text:"HIPAA-compliant secure messaging" },
              ].map(({icon,text})=>(
                <div key={text} className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{background:"rgba(20,184,166,0.15)"}}>
                    {icon}
                  </div>
                  <span className="text-slate-300 text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badges */}
          <div className="relative z-10 flex flex-wrap gap-2">
            {["HIPAA Compliant","SOC 2 Type II","256-bit TLS","FDA Class II Ready"].map(b=>(
              <div key={b} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-slate-300"
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)"}}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill="#14b8a6"/>
                </svg>
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative overflow-hidden"
          style={{background:"linear-gradient(160deg,#f0fdfa 0%,#f8fafc 50%,#f0f9ff 100%)"}}>

          {/* Right bg — faint cross grid */}
          <div className="absolute inset-0" style={{opacity:0.04}}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="crossgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <line x1="20" y1="12" x2="20" y2="28" stroke="#0f766e" strokeWidth="1.5"/>
                  <line x1="12" y1="20" x2="28" y2="20" stroke="#0f766e" strokeWidth="1.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#crossgrid)"/>
            </svg>
          </div>

          {/* Right bg — corner cell decorations */}
          <div className="absolute top-0 right-0 anim-drift" style={{opacity:0.06}}>
            <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
              <circle cx="180" cy="40" r="80" stroke="#0f766e" strokeWidth="1"/>
              <circle cx="180" cy="40" r="55" stroke="#0f766e" strokeWidth="0.8"/>
              <circle cx="180" cy="40" r="30" stroke="#14b8a6" strokeWidth="1.2" fill="rgba(20,184,166,0.05)"/>
              <circle cx="180" cy="40" r="10" fill="#14b8a6" opacity="0.2"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 anim-drift" style={{opacity:0.06,animationDelay:"3s"}}>
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
              <circle cx="20" cy="180" r="75" stroke="#0f766e" strokeWidth="1"/>
              <circle cx="20" cy="180" r="50" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="20" cy="180" r="25" stroke="#0f766e" strokeWidth="1" fill="rgba(20,184,166,0.04)"/>
            </svg>
          </div>

          {/* Right bg — floating micro molecules */}
          {[
            {top:"15%",left:"8%",size:40,delay:"0s"},
            {top:"75%",left:"85%",size:30,delay:"2s"},
            {top:"40%",left:"90%",size:24,delay:"1s"},
          ].map(({top,left,size,delay},i)=>(
            <div key={i} className="absolute anim-float-med" style={{top,left,animationDelay:delay,opacity:0.1}}>
              <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="6" fill="#0f766e"/>
                {[0,72,144,216,288].map(d=>{const r=d*Math.PI/180;return(
                  <g key={d}>
                    <line x1={20} y1={20} x2={20+14*Math.cos(r)} y2={20+14*Math.sin(r)} stroke="#0f766e" strokeWidth="1.5"/>
                    <circle cx={20+14*Math.cos(r)} cy={20+14*Math.sin(r)} r="4" fill="#14b8a6"/>
                  </g>
                )})}
              </svg>
            </div>
          ))}

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"#0f766e"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="white"/>
                <path d="M12 6v2M12 16v2M6 12H4M20 12h-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-slate-800">OncoLens</span>
          </div>

          <div className="w-full max-w-md relative z-10">

            {/* Card */}
            <div className="rounded-2xl p-8"
              style={{background:"rgba(255,255,255,0.85)",backdropFilter:"blur(12px)",border:"1px solid rgba(15,118,110,0.12)",boxShadow:"0 20px 60px rgba(15,118,110,0.08),0 4px 16px rgba(0,0,0,0.06)"}}>

              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{background:"rgba(15,118,110,0.08)",color:"#0f766e",border:"1px solid rgba(15,118,110,0.2)"}}>
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#0f766e"/></svg>
                    Secure Patient Portal
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{background:"rgba(14,165,233,0.08)",color:"#0284c7",border:"1px solid rgba(14,165,233,0.2)"}}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    HIPAA
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
                <p className="mt-1.5 text-slate-500 text-sm">Access AI-powered oncology tools and care coordination.</p>

                {/* Thin ECG divider */}
                <div className="mt-4" style={{opacity:0.3}}>
                  <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                    <path d="M0 10 L60 10 L70 10 L76 2 L82 18 L88 4 L94 16 L100 10 L160 10 L170 10 L176 2 L182 18 L188 4 L194 16 L200 10 L400 10"
                      stroke="#0f766e" strokeWidth="1.5" fill="none" strokeDasharray="400" strokeDashoffset="400"
                      style={{animation:"ecg-draw 2s ease-out 0.5s forwards"}}/>
                  </svg>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">

                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <input className="input pl-9" style={{borderColor:"rgba(15,118,110,0.2)",background:"rgba(255,255,255,0.8)"}}
                      placeholder="Dr. Jane Smith" value={form.full_name}
                      onChange={e=>setForm({...form,full_name:e.target.value})} required/>
                  </div>
                </div>

                {/* Role cards */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value:"clinician", label:"Clinician", desc:"Oncologist / Radiologist",
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 1.2-.504 2.4-1.386 3.24-.882.84-2.07 1.26-3.282 1.26H7.668c-1.212 0-2.4-.42-3.282-1.26A4.32 4.32 0 0 1 3 12V6l9-3 9 3v6z"/></svg>
                      },
                      {
                        value:"patient", label:"Patient", desc:"Receiving oncology care",
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      },
                    ].map(({value,label,desc,icon})=>(
                      <button key={value} type="button" onClick={()=>setForm({...form,role:value})}
                        className="rounded-xl p-4 text-left transition-all"
                        style={{
                          border: form.role===value ? "2px solid #0f766e" : "2px solid #e2e8f0",
                          background: form.role===value
                            ? "linear-gradient(135deg,rgba(15,118,110,0.08) 0%,rgba(20,184,166,0.05) 100%)"
                            : "rgba(255,255,255,0.6)",
                          boxShadow: form.role===value ? "0 2px 12px rgba(15,118,110,0.15)" : "none"
                        }}>
                        <div className="mb-2" style={{color: form.role===value ? "#0f766e" : "#94a3b8"}}>{icon}</div>
                        <div className="text-sm font-semibold text-slate-800">{label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <input className="input pl-9" type="email" style={{borderColor:"rgba(15,118,110,0.2)",background:"rgba(255,255,255,0.8)"}}
                      placeholder="you@hospital.org" value={form.email}
                      onChange={e=>setForm({...form,email:e.target.value})} required/>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <input className="input pl-9" type="password" style={{borderColor:"rgba(15,118,110,0.2)",background:"rgba(255,255,255,0.8)"}}
                      placeholder="Min. 8 characters" value={form.password}
                      onChange={e=>setForm({...form,password:e.target.value})} required/>
                  </div>
                </div>

                {/* Messages */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm"
                    style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}
                {message && (
                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm"
                    style={{background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#16a34a"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    {message}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{
                    background: loading ? "#64748b" : "linear-gradient(135deg,#0f766e 0%,#0c4a6e 100%)",
                    boxShadow: loading ? "none" : "0 6px 20px rgba(15,118,110,0.4)",
                    letterSpacing:"0.02em"
                  }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                      </svg>
                      Create account
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold" style={{color:"#0f766e"}}>Sign in</Link>
              </p>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400 leading-relaxed px-4">
              Protected under HIPAA guidelines. Your data is encrypted end-to-end.<br/>
              <span style={{color:"#0f766e"}}>Terms of Service</span> · <span style={{color:"#0f766e"}}>Privacy Policy</span>
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
