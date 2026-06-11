// frontend/src/app/dashboard/page.tsx
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

export default function DashboardOverview() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardContext = async () => {
      try {
        const response = await api.get("/sessions");
        setSessions(response.data);
      } catch (err) {
        console.error("Could not populate workspace dashboard history framework", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardContext();
  }, []);

  // Compute live matrix counts from the user's historical list array
  const totalInterviews = sessions.length;
  const uniqueGapsCount = Array.from(
    new Set(sessions.flatMap(s => s.missing_skills))
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome to your Workspace</h1>
        <p className="mt-2 text-slate-600">Track your progress and start new interview sessions.</p>
      </header>

      {/* Quick Action Banner */}
      <div className="bg-teal-600 rounded-2xl p-8 text-white shadow-md mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Ready for your next mock interview?</h2>
          <p className="text-teal-100">Upload your latest resume and job description to get started.</p>
        </div>
        <Link 
          href="/dashboard/setup" 
          className="whitespace-nowrap rounded-lg bg-white px-6 py-3 text-base font-semibold text-teal-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          + Start New Session
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Interviews Configured" value={totalInterviews.toString()} subtext="Lifetime sessions" />
        <StatCard title="Average Performance" value="--" subtext="Awaiting simulator scoring" />
        <StatCard title="Targeted Skill Gaps" value={uniqueGapsCount.toString()} subtext="Aggregated unique gap areas" />
      </div>

      {/* Recent Activity Sync */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Session History</h3>
        
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>No historical interview configuration profiles populated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{session.resume_filename}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configured on {new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                  </p>
                </div>
                <Link 
                  href={`/dashboard/interviews/${session.id}`}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors"
                >
                  View Analysis &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext }: { title: string, value: string, subtext: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <p className="text-xs text-slate-400">{subtext}</p>
    </div>
  );
}