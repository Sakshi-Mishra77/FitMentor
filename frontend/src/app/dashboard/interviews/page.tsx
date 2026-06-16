// frontend/src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

interface Session {
  id: string;
  session_type?: "analysis" | "interview";
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Activity History</h1>
          <p className="text-slate-600 text-sm mt-1">Review your past resume analyses and interview sessions.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/resume-analysis/setup" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-teal-500 transition-colors">
            Analyze Resume
          </Link>
          <Link href="/dashboard/mock-interview/setup" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-teal-500 transition-colors">
            Start Interview
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-500 text-sm shadow-sm">
          No activity records found. Start a new session to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map(s => (
            <div key={s.id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
              <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase rounded-bl-lg ${
                s.session_type === 'interview' ? 'bg-teal-50 text-teal-600' : 'bg-teal-50 text-teal-600'
              }`}>
                {s.session_type || 'analysis'}
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  <span className="font-bold text-teal-600">{s.job_description ? `Match: ${s.match_percentage}%` : "General"}</span>
                </div>
                <h3 className="font-bold text-slate-900 truncate pr-16">{s.resume_filename}</h3>
              </div>
              <Link href={`/dashboard/interviews/${s.id}`} className="mt-4 block w-full text-center bg-slate-50 text-slate-700 rounded-md py-2 text-xs font-semibold border hover:bg-slate-100 transition-colors">
                Open Details &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}