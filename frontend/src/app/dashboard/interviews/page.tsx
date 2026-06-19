// frontend/src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

interface Session {
  id: string;
  session_type: string;
  interview_type?: string;
  resume_filename: string;
  job_description: string;
  match_percentage: number;
  created_at: string;
}

export default function SessionsHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/sessions")
      .then(res => setSessions(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workspace History</h1>
          <p className="text-slate-600 text-sm mt-1">Review past ATS optimizations and mock interview simulations.</p>
        </div>
        
        {/* UPDATED DUAL LINKS */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link 
            href="/dashboard/resume-analysis/setup" 
            className="flex-1 md:flex-none text-center bg-white border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors"
          >
            + New Analysis
          </Link>
          <Link 
            href="/dashboard/mock-interview/setup" 
            className="flex-1 md:flex-none text-center bg-teal-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-teal-500 shadow-sm transition-colors"
          >
            + New Interview
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 9.75v9a2.25 2.25 0 002.25 2.25z" /></svg>
          <h3 className="text-base font-bold text-slate-900">No history mapped</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Upload context data parameters via the setup modules to activate metrics logging.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-medium text-slate-400">{new Date(s.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  <span className={`px-2 py-0.5 font-bold uppercase tracking-wider rounded text-[10px] ${s.session_type === 'interview' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700'}`}>
                    {s.session_type === 'interview' ? 'Interview' : 'ATS Analysis'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 truncate mb-1">{s.resume_filename}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                  {s.job_description || "General Context Mode (No JD Provided)"}
                </p>
              </div>
              <Link 
                href={`/dashboard/interviews/${s.id}`} 
                className="mt-2 block w-full text-center bg-slate-50 text-slate-700 rounded-lg py-2.5 text-xs font-bold border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                Open Workspace &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}