// frontend/src/app/dashboard/interviews/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import api from "@/services/api";

interface SessionData {
  id: string;
  resume_filename: string;
  job_description: string;
  extracted_skills: string[];
  missing_skills: string[];
  match_percentage: number;
  ats_suggestions: string[];
  modified_resume_text: string;
}

export default function InterviewRoomSetup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "resume">("analysis");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await api.get(`/sessions/${id}`);
        setSession(response.data);
      } catch (err: any) {
        setError("Unable to retrieve validation logs for this session mapping.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/sessions/${id}/download-resume`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Optimized_${session?.resume_filename || "Resume.pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to compile target PDF download pipeline stream.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50/50">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Parsing Vector Space...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-900 mb-4">{error}</p>
        <Link href="/dashboard" className="inline-flex justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isJdBased = session.job_description.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      
      {/* 1. PREMIUM BREADCRUMB & METADATA HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate max-w-[200px]">{session.resume_filename}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Optimization Matrix</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert("Initializing Audio/Video stream loops...")}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-500 transition-all group gap-1.5"
          >
            Start Mock Interview
            <span className="text-teal-200 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTROLS (CLEAN UNDERLINE SPEC) */}
      <div className="flex border-b border-slate-200 gap-8 text-sm font-medium">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`pb-4 border-b-2 transition-all relative ${
            activeTab === "analysis" 
              ? "border-slate-900 text-slate-900 font-semibold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Analysis Overview
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`pb-4 border-b-2 transition-all relative flex items-center gap-1.5 ${
            activeTab === "resume" 
              ? "border-slate-900 text-slate-900 font-semibold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <span>ATS Tailored Preview</span>
          <span className="inline-flex items-center rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-600/10">Draft</span>
        </button>
      </div>

      {/* 3. DYNAMIC TAB RENDER LOOP */}
      {activeTab === "analysis" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT CONTENT DECK (COMPETENCIES & ADVICE ANALYSIS) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Visual Skill Overlaps Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Extracted Asset Tags */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identified Strengths</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{session.extracted_skills.length} Found</span>
                </div>
                {session.extracted_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.extracted_skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/60 px-2 py-1 text-xs font-medium text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specialized core engineering keywords detected.</p>
                )}
              </div>

              {/* Missing Gaps Tags */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Gaps</h3>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{isJdBased ? session.missing_skills.length : 0} Missing</span>
                </div>
                {!isJdBased ? (
                  <p className="text-xs text-slate-400 italic leading-relaxed">General mode evaluation. Inject a job description target block to generate live gap logging analytics.</p>
                ) : session.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.missing_skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-amber-50/60 border border-amber-200/50 px-2 py-1 text-xs font-semibold text-amber-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium leading-relaxed bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">✓ Complete alignment profile found across the given criteria.</p>
                )}
              </div>

            </div>

            {/* Custom Guidelines Stream Feed */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actionable Optimization Steps</h3>
              <div className="space-y-3">
                {session.ats_suggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-colors"
                  >
                    {/* Visual left priority line accent */}
                    <div className={`w-1.5 ${suggestion.includes('⚠️') ? 'bg-red-500' : suggestion.includes('⚡') ? 'bg-amber-400' : 'bg-teal-500'}`} />
                    <div className="p-4 flex items-start gap-3.5">
                      <div className="text-sm text-slate-700 leading-relaxed font-medium">{suggestion}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR PANEL (COMPATIBILITY TELEMETRY) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Parsing Match Yield</h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculated vector density vs role constraints.</p>
              </div>

              {/* Human-designed Score Block */}
              <div className="py-6 flex flex-col items-center justify-center border-y border-slate-100">
                <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-[6px] border-slate-100 shadow-inner">
                  <div className="text-3xl font-black text-slate-800 tracking-tight">
                    {isJdBased ? `${session.match_percentage}%` : "--"}
                  </div>
                </div>
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-4">
                  {isJdBased && session.match_percentage > 75 ? "Highly Compatible" : isJdBased ? "Needs Calibration" : "Awaiting Context"}
                </div>
              </div>

              {/* Context Manifest Specs */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Mode:</span>
                  <span className="font-semibold text-slate-700">{isJdBased ? "Target Role Guided" : "General Ingestion"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Vectors Mapped:</span>
                  <span className="font-semibold text-slate-700">{session.extracted_skills.length + (isJdBased ? session.missing_skills.length : 0)} Keynotes</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        // RESUME TEXT PREVIEW WORKSPACE
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-xl p-5 shadow-sm text-white">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm">ATS Compliant Output Schema</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Keywords embedded smoothly within your core configuration framework summaries.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center justify-center whitespace-nowrap bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm gap-2"
            >
              {downloading ? "Compiling PDF Data..." : "Download Document (PDF)"}
            </button>
          </div>

          {/* Code/Text Canvas Editor Block Mock */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl p-6 overflow-x-auto max-h-[65vh] font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed scrollbar-thin">
            {session.modified_resume_text}
          </div>
        </div>
      )}

    </div>
  );
}