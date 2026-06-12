// frontend/src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

interface Session {
  id: string;
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
          <h1 className="text-3xl font-bold text-slate-900">Interview Configurations</h1>
          <p className="text-slate-600 text-sm mt-1">Review optimizations or deploy new test environments.</p>
        </div>
        <Link href="/dashboard/setup" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-teal-500">
          + Start New Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-500 text-sm shadow-sm">
          No history runs mapped. Upload context data parameters to activate metrics logging.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map(s => (
            <div key={s.id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  <span className="font-bold text-teal-600">{s.job_description ? `Match: ${s.match_percentage}%` : "General"}</span>
                </div>
                <h3 className="font-bold text-slate-900 truncate">{s.resume_filename}</h3>
              </div>
              <Link href={`/dashboard/interviews/${s.id}`} className="mt-4 block w-full text-center bg-slate-50 text-slate-700 rounded-md py-2 text-xs font-semibold border hover:bg-slate-100">
                Open Matrix Evaluation &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}