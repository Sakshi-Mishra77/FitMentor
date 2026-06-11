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
}

export default function InterviewRoomSetup({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params safely in modern Next.js
  const { id } = use(params);

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await api.get(`/sessions/${id}`);
        setSession(response.data);
      } catch (err: any) {
        setError("Failed to load interview context. Please return to the dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Assembling your custom workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-xl mx-auto text-center mt-12">
        <p className="font-semibold mb-3">{error || "Session not found."}</p>
        <Link href="/dashboard" className="text-sm bg-white border border-red-200 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-slate-50 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isJdBased = session.job_description.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Banner Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pre-Interview Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">Context Sync: {session.resume_filename}</p>
        </div>
        <button 
          onClick={() => alert("Launching AV streaming setup next phase!")}
          className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-teal-500 transition-all text-sm whitespace-nowrap"
        >
          Start Live Simulation &rarr;
        </button>
      </div>

      {/* Grid Architecture: Metrics Left, Config Details Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid Panel: Skills Analytics Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Extracted Assets */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Identified Resume Assets
            </h3>
            {session.extracted_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {session.extracted_skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No specific specialized tags parsed from the plain-text.</p>
            )}
          </div>

          {/* Missing Skills Gap Analysis */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Critical Alignment Gap Targets
            </h3>
            {!isJdBased ? (
              <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                Running in <strong>General Mode</strong>. Paste a targeted job description next time to enable specific structural gap tracking.
              </p>
            ) : session.missing_skills.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">The following qualifications are required in the job description but appear missing or unreferenced on your current resume:</p>
                <div className="flex flex-wrap gap-2">
                  {session.missing_skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/10">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-emerald-600 font-medium bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                ✓ Perfect Matrix Alignment! Your resume matches all high-priority keywords extracted from the JD requirements.
              </p>
            )}
          </div>
        </div>

        {/* Right Grid Panel: Configuration Manifest Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Simulation Manifest</h3>
            <div className="border-t border-slate-100 pt-3 text-xs space-y-2.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Pipeline:</span>
                <span className="font-semibold text-slate-800">{isJdBased ? "JD-Driven Simulation" : "General Matrix Evaluation"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AV Stream Target:</span>
                <span className="font-semibold text-slate-800">Video + Audio + Text</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Adaptations:</span>
                <span className="font-semibold text-slate-800">5 Deep Questions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}