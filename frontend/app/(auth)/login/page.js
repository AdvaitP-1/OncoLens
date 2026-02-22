"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    router.push(profile?.role === "clinician" ? "/clinician/dashboard" : "/patient/dashboard");
  }

  return (
    <>
      <style>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-12px) rotate(3deg)} }
        @keyframes float-med  { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-7px) rotate(-2deg)} }
        @keyframes pulse-ring { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.04)} }
        @keyframes ecg-draw   { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
        @keyframes drift      { 0%{transform:translate(0,0)} 33%{transform:translate(6px,-4px)} 66%{transform:translate(-4px,6px)} 100%{transform:translate(0,0)} }
        .anim-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .anim-float-med  { animation: float-med  4.5s ease-in-out infinite; }
        .anim-pulse-ring { animation: pulse-ring 3s ease-in-out infinite; }
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

          {/* Layer 2 — atom rings top-right */}
          <div className="absolute -top-24 -right-24 anim-pulse-ring" style={{ opacity: 0.12 }}>
            <svg width="420" height="420" viewBox="0 0 420 420" fill="none">
              <circle cx="210" cy="210" r="200" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="160" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="120" stroke="#14b8a6" strokeWidth="0.8"/>
              <circle cx="210" cy="210" r="80"  stroke="#14b8a6" strokeWidth="1.2"/>
              <circle cx="210" cy="210" r="40"  stroke="#14b8a6" strokeWidth="1.2" fill="rgba(20,184,166,0.05)"/>
              {[0,60,120,180,240,300].map(deg => {
                const rv = 160, rad = deg * Math.PI / 180;
                const cx = Math.round((210 + rv * Math.cos(rad)) * 10000) / 10000;
                const cy = Math.round((210 + rv * Math.sin(rad)) * 10000) / 10000;
                return <circle key={deg} cx={cx} cy={cy} r="4" fill="#14b8a6" opacity="0.6"/>;
              })}
              {[0,45,90,135,180,225,270,315].map(deg => {
                const rv = 200, rad = deg * Math.PI / 180;
                const cx = Math.round((210 + rv * Math.cos(rad)) * 10000) / 10000;
                const cy = Math.round((210 + rv * Math.sin(rad)) * 10000) / 10000;
                return <circle key={deg} cx={cx} cy={cy} r="2.5" fill="#0f766e" opacity="0.5"/>;
              })}
            </svg>
          </div>

          {/* Layer 3 — molecular network bottom-left */}
          <div className="absolute -bottom-16 -left-12" style={{ opacity: 0.13 }}>
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none">
              {[
                [60,240,140,200],[140,200,200,240],[200,240,260,200],
                [140,200,160,140],[160,140,220,120],[160,140,100,110],
                [100,110,60,140],[60,140,60,240],[100,110,140,60],
                [140,60,220,80],[220,80,220,120]
              ].map(([x1,y1,x2,y2],i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14b8a6" strokeWidth="1.2"/>
              ))}
              {[
                [60,240,5],[140,200,8],[200,240,4],[260,200,5],
                [160,140,9],[220,120,5],[100,110,6],[60,140,4],[140,60,7],[220,80,4]
              ].map(([cx,cy,r],i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="#14b8a6" opacity="0.7"/>
              ))}
            </svg>
          </div>

          {/* Layer 4 — floating crosses */}
          {[
            {top:"18%",left:"70%",size:18,delay:"0s"},
            {top:"55%",left:"80%",size:12,delay:"1.2s"},
            {top:"72%",left:"55%",size:10,delay:"0.6s"},
            {top:"30%",left:"15%",size:14,delay:"1.8s"},
          ].map(({top,left,size,delay},i) => (
            <div key={i} className="absolute anim-float-med" style={{top,left,animationDelay:delay,opacity:0.15}}>
              <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
                <rect x="8" y="0" width="4" height="20" rx="2" fill="white"/>
                <rect x="0" y="8" width="20" height="4" rx="2" fill="white"/>
              </svg>
            </div>
          ))}

          {/* Layer 5 — glowing orbs */}
          {[
            {top:"22%",left:"60%",w:80,c:"#14b8a6"},
            {top:"65%",left:"72%",w:50,c:"#0f766e"},
            {top:"45%",left:"10%",w:60,c:"#0ea5e9"},
          ].map(({top,left,w,c},i) => (
            <div key={i} className="absolute rounded-full anim-pulse-ring"
              style={{top,left,width:w,height:w,background:`radial-gradient(circle,${c}22 0%,transparent 70%)`,animationDelay:`${i*1.1}s`}}/>
          ))}

          {/* Layer 6 — ECG line */}
          <div className="absolute left-0 right-0" style={{top:"52%",opacity:0.25}}>
            <svg width="100%" height="60" viewBox="0 0 600 60" preserveAspectRatio="none">
              <path
                d="M0 30 L60 30 L80 30 L90 8 L100 52 L112 14 L122 44 L134 30 L180 30 L200 30 L210 8 L220 52 L232 14 L242 44 L254 30 L300 30 L320 30 L330 8 L340 52 L352 14 L362 44 L374 30 L420 30 L440 30 L450 8 L460 52 L472 14 L482 44 L494 30 L600 30"
                stroke="#14b8a6" strokeWidth="1.5" fill="none"
                strokeDasharray="600" strokeDashoffset="600"
                style={{animation:"ecg-draw 3s ease-out forwards"}}
              />
            </svg>
          </div>

          {/* Layer 7 — floating cell */}
          <div className="absolute anim-float-slow" style={{top:"35%",right:"-20px",opacity:0.12}}>
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
              <ellipse cx="80" cy="80" rx="75" ry="55" stroke="#14b8a6" strokeWidth="1.5"/>
              <ellipse cx="80" cy="80" rx="55" ry="38" stroke="#0f766e" strokeWidth="1" strokeDasharray="4 3"/>
              <ellipse cx="80" cy="80" rx="22" ry="18" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" strokeWidth="1.5"/>
              <circle cx="80" cy="80" r="7" fill="#14b8a6" opacity="0.6"/>
              {[0,72,144,216,288].map(d => {
                const rad = d * Math.PI / 180;
                return <circle key={d}
                  cx={Math.round((80+52*Math.cos(rad))*10000)/10000}
                  cy={Math.round((80+35*Math.sin(rad))*10000)/10000}
                  r="3" fill="#0f766e" opacity="0.5"/>;
              })}
            </svg>
          </div>

          {/* ── Logo ── */}
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

          {/* ── Center content ── */}
          <div className="relative z-10 space-y-7">
            {/* Microscope SVG instead of DNA for login variety */}
            <div className="anim-float-slow">
              <svg width="110" height="140" viewBox="0 0 110 140" fill="none">
                <defs>
                  <linearGradient id="scope" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6"/>
                    <stop offset="100%" stopColor="#0284c7"/>
                  </linearGradient>
                </defs>
                {/* Eyepiece */}
                <rect x="42" y="5" width="26" height="14" rx="7" fill="url(#scope)" opacity="0.9"/>
                {/* Body tube */}
                <rect x="47" y="18" width="16" height="40" rx="4" fill="#0f766e" opacity="0.8"/>
                {/* Arm */}
                <path d="M55 58 Q30 72 30 90" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" fill="none"/>
                {/* Stage */}
                <rect x="18" y="88" width="74" height="8" rx="4" fill="#0f766e" opacity="0.7"/>
                {/* Base */}
                <rect x="22" y="118" width="66" height="12" rx="6" fill="#0f766e" opacity="0.6"/>
                {/* Leg */}
                <rect x="51" y="96" width="8" height="22" rx="4" fill="#14b8a6" opacity="0.5"/>
                {/* Objective lens */}
                <circle cx="55" cy="62" r="8" fill="rgba(20,184,166,0.3)" stroke="#14b8a6" strokeWidth="1.5"/>
                <circle cx="55" cy="62" r="4" fill="#14b8a6" opacity="0.7"/>
                {/* Glow rings */}
                <circle cx="55" cy="62" r="14" stroke="#14b8a6" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="55" cy="62" r="20" stroke="#14b8a6" strokeWidth="0.5" opacity="0.15"/>
                {/* Sample glow */}
                <ellipse cx="55" cy="92" rx="20" ry="5" fill="rgba(20,184,166,0.12)" stroke="#14b8a6" strokeWidth="0.8" opacity="0.5"/>
              </svg>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Welcome back,<br/>
                <span style={{color:"#14b8a6"}}>clinician.</span>
              </h2>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-xs">
                Sign in to access your patient cases, triage queue, and collaboration workspace.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {val:"10k+", label:"Patients"},
                {val:"500+", label:"Oncologists"},
                {val:"99.9%",label:"Uptime"},
              ].map(({val,label}) => (
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <div className="text-lg font-bold" style={{color:"#14b8a6"}}>{val}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="space-y-2.5">
              {[
                {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>, text:"AI-assisted imaging & pathology analysis"},
                {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, text:"Real-time biomarker & vitals tracking"},
                {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, text:"Multi-disciplinary tumor board"},
                {icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, text:"HIPAA-compliant secure messaging"},
              ].map(({icon,text}) => (
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
            {["HIPAA Compliant","SOC 2 Type II","256-bit TLS","FDA Class II Ready"].map(b => (
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

          {/* Faint cross grid */}
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

          {/* Corner cell decorations */}
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

          {/* Floating micro molecules */}
          {[
            {top:"15%",left:"8%",size:40,delay:"0s"},
            {top:"75%",left:"85%",size:30,delay:"2s"},
            {top:"40%",left:"90%",size:24,delay:"1s"},
          ].map(({top,left,size,delay},i) => (
            <div key={i} className="absolute anim-float-med" style={{top,left,animationDelay:delay,opacity:0.1}}>
              <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="6" fill="#0f766e"/>
                {[0,72,144,216,288].map(d => {
                  const rad = d * Math.PI / 180;
                  const x2 = Math.round((20+14*Math.cos(rad))*10000)/10000;
                  const y2 = Math.round((20+14*Math.sin(rad))*10000)/10000;
                  return (
                    <g key={d}>
                      <line x1={20} y1={20} x2={x2} y2={y2} stroke="#0f766e" strokeWidth="1.5"/>
                      <circle cx={x2} cy={y2} r="4" fill="#14b8a6"/>
                    </g>
                  );
                })}
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
            <div className="rounded-2xl p-8"
              style={{background:"rgba(255,255,255,0.85)",backdropFilter:"blur(12px)",border:"1px solid rgba(15,118,110,0.12)",boxShadow:"0 20px 60px rgba(15,118,110,0.08),0 4px 16px rgba(0,0,0,0.06)"}}>

              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{background:"rgba(15,118,110,0.08)",color:"#0f766e",border:"1px solid rgba(15,118,110,0.2)"}}>
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#0f766e"/></svg>
                    Secure Access
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{background:"rgba(14,165,233,0.08)",color:"#0284c7",border:"1px solid rgba(14,165,233,0.2)"}}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    HIPAA
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Sign in to OncoLens</h1>
                <p className="mt-1.5 text-slate-500 text-sm">Access your triage queue and patient collaboration workspace.</p>

                {/* ECG divider */}
                <div className="mt-4" style={{opacity:0.3}}>
                  <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                    <path
                      d="M0 10 L60 10 L70 10 L76 2 L82 18 L88 4 L94 16 L100 10 L160 10 L170 10 L176 2 L182 18 L188 4 L194 16 L200 10 L400 10"
                      stroke="#0f766e" strokeWidth="1.5" fill="none"
                      strokeDasharray="400" strokeDashoffset="400"
                      style={{animation:"ecg-draw 2s ease-out 0.5s forwards"}}
                    />
                  </svg>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">

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
                    <input
                      className="input"
                      type="email"
                      placeholder="you@hospital.org"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={{borderColor:"rgba(15,118,110,0.2)",background:"rgba(255,255,255,0.8)",paddingLeft:"2.5rem"}}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                    <Link href="/forgot-password" className="text-xs font-medium" style={{color:"#0f766e"}}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <input
                      className="input"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{borderColor:"rgba(15,118,110,0.2)",background:"rgba(255,255,255,0.8)",paddingLeft:"2.5rem"}}
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg p-3 text-sm"
                    style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{
                    background: loading ? "#64748b" : "linear-gradient(135deg,#0f766e 0%,#0c4a6e 100%)",
                    boxShadow: loading ? "none" : "0 6px 20px rgba(15,118,110,0.4)",
                    letterSpacing:"0.02em"
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                      Sign in to OncoLens
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold" style={{color:"#0f766e"}}>Create account</Link>
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
