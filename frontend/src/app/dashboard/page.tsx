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

      {/* Feature Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:border-teal-500 transition-colors group">
          <div className="h-12 w-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Resume Analysis</h2>
          <p className="text-slate-600 text-sm mb-6">Get detailed feedback, ATS compatibility scores, and tailored suggestions to optimize your resume.</p>
          <Link 
            href="/dashboard/resume-analysis/setup" 
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
          >
            Analyze Resume &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:border-teal-500 transition-colors group">
          <div className="h-12 w-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Mock Interview</h2>
          <p className="text-slate-600 text-sm mb-6">Practice with our AI interviewer tailored to your target role and receive instant performance feedback.</p>
          <Link 
            href="/dashboard/mock-interview/setup" 
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
          >
            Start Interview &rarr;
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Sessions" value={totalInterviews.toString()} subtext="Lifetime activity" />
        <StatCard title="Average Performance" value="--" subtext="Awaiting simulator scoring" />
        <StatCard title="Targeted Skill Gaps" value={uniqueGapsCount.toString()} subtext="Aggregated unique gap areas" />
      </div>

      {/* Recent Activity Sync */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
        
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>No activity records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      (session as any).session_type === 'interview' 
                        ? 'bg-teal-50 text-teal-600' 
                        : 'bg-teal-50 text-teal-600'
                    }`}>
                      {(session as any).session_type || 'analysis'}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 truncate">{session.resume_filename}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Created on {new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                  </p>
                </div>
                <Link 
                  href={`/dashboard/interviews/${session.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors border border-slate-200"
                >
                  View Details &rarr;
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