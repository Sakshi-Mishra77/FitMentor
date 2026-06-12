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
        setError("Failed to locate current workspace parameter criteria.");
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
      alert("Error occurred downloading your file stream. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Assembling optimization workflows...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-xl mx-auto text-center mt-12">
        <p className="font-semibold mb-3">{error}</p>
        <Link href="/dashboard" className="text-sm bg-white border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isJdBased = session.job_description.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Upper Title Block Layout */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ATS Workspace Studio</h1>
          <p className="text-sm text-slate-500 mt-1">Active Manifest Target: {session.resume_filename}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert("Launching AV Streaming Room Next Phase!")}
            className="rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-teal-500 transition-all text-sm"
          >
            Start Live Simulation &rarr;
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Architecture */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "analysis" ? "border-teal-600 text-teal-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"}`}
        >
          Analysis Metrics
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "resume" ? "border-teal-600 text-teal-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"}`}
        >
          ✨ ATS Optimized Resume Preview
        </button>
      </div>

      {/* Tab Switching Frame Engine */}
      {activeTab === "analysis" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Extracted Resume Keywords ({session.extracted_skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {session.extracted_skills.map((s) => (
                  <span key={s} className="bg-slate-50 border px-2.5 py-1 text-xs font-medium rounded-md text-slate-700">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Identified Skills Missing Gaps
              </h3>
              {isJdBased ? (
                session.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.missing_skills.map((s) => (
                      <span key={s} className="bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 text-xs font-semibold rounded-md">{s}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600">✓ Excellent job! Total structural alignment matched.</p>
                )
              ) : (
                <p className="text-sm text-slate-400 italic">No job description block loaded to evaluate.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span> Algorithmic Parser Guidelines
              </h3>
              <ul className="space-y-2">
                {session.ats_suggestions.map((s, i) => (
                  <li key={i} className="text-sm bg-slate-50 border p-3 rounded-lg text-slate-700">{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 text-center h-fit shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 mb-4">ATS Compatibility Score</h3>
            <div className="text-5xl font-extrabold text-slate-900">{isJdBased ? `${session.match_percentage}%` : "--"}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm">ATS Optimized Standard Blueprint</h3>
              <p className="text-xs text-slate-400 mt-0.5">This copy automatically maps the missing technical keywords inside your summary manifest for parser compliance.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {downloading ? "Compiling Output..." : "📥 Download Optimized Resume (PDF)"}
            </button>
          </div>

          <div className="bg-white border rounded-xl shadow-inner p-6 overflow-x-auto max-h-[60vh] font-mono text-xs text-slate-800 whitespace-pre leading-relaxed shadow-slate-100">
            {session.modified_resume_text}
          </div>
        </div>
      )}
    </div>
  );
}