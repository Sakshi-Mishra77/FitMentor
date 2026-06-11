// frontend/src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

interface InterviewSession {
  id: string;
  resume_filename: string;
  job_description: string;
  extracted_skills: string[];
  missing_skills: string[];
  created_at: string;
}

export default function InterviewsHistoryPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get("/sessions");
        setSessions(response.data);
      } catch (err) {
        console.error("Failed to fetch sessions history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mock Interviews</h1>
          <p className="mt-1 text-slate-600">Review your past session analytics or start a new simulator path.</p>
        </div>
        <Link
          href="/dashboard/setup"
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
        >
          + New Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4 shadow-sm">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 9.75v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h3 className="text-base font-bold text-slate-900">No interview sessions found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Upload a resume and target job description to configure your first evaluation workspace.</p>
          <Link href="/dashboard/setup" className="inline-block mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Get Started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-400">
                    {new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${session.job_description ? 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/10' : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10'}`}>
                    {session.job_description ? 'JD-Based' : 'General'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 truncate mb-1">{session.resume_filename}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {session.job_description || "No targeted job specification context provided."}
                </p>
                
                <div className="flex gap-4 text-xs font-medium text-slate-600 border-t border-slate-50 pt-3 mb-4">
                  <div>Assets: <span className="text-emerald-600 font-bold">{session.extracted_skills.length}</span></div>
                  <div>Gaps: <span className="text-amber-600 font-bold">{session.missing_skills.length}</span></div>
                </div>
              </div>
              
              <Link 
                href={`/dashboard/interviews/${session.id}`}
                className="w-full text-center block rounded-md bg-slate-50 border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
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