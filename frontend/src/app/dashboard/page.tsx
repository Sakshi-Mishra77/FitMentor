// frontend/src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api";

interface InterviewSession {
  id: string;
  session_type: string;
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

  const totalInterviews = sessions.filter(s => s.session_type === 'interview').length;
  const totalAnalysis = sessions.filter(s => s.session_type === 'analysis').length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome to your Workspace</h1>
        <p className="mt-2 text-slate-600">Track your progress and launch specialized interview pipelines.</p>
      </header>

      {/* Dual Action Banners for Separated Pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Mock Interview Launch Card */}
        <div className="bg-teal-600 rounded-2xl p-8 text-white shadow-md flex flex-col justify-between h-full group hover:shadow-lg transition-shadow">
          <div>
            <div className="h-10 w-10 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Live Mock Interview</h2>
            <p className="text-teal-100 text-sm mb-6 leading-relaxed">Practice in a real-time AV environment with our AI using your resume and target role context.</p>
          </div>
          {/* UPDATED LINK */}
          <Link 
            href="/dashboard/mock-interview/setup" 
            className="text-center rounded-lg bg-white px-6 py-3 text-sm font-bold text-teal-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Start Interview Studio &rarr;
          </Link>
        </div>

        {/* ATS Resume Analyzer Launch Card */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-md flex flex-col justify-between h-full group hover:shadow-lg transition-shadow">
          <div>
            <div className="h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">ATS Resume Analyzer</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">Scan and optimize your resume keywords against tracking algorithms for specific job descriptions.</p>
          </div>
          {/* UPDATED LINK */}
          <Link 
            href="/dashboard/resume-analysis/setup" 
            className="text-center rounded-lg bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-500 transition-colors"
          >
            Analyze Resume &rarr;
          </Link>
        </div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Interviews Conducted" value={totalInterviews.toString()} subtext="Lifetime simulator sessions" />
        <StatCard title="Resumes Analyzed" value={totalAnalysis.toString()} subtext="ATS optimization runs" />
        <StatCard title="Platform Status" value="Active" subtext="All systems operational" />
      </div>

      {/* Recent Activity Sync */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Session History</h3>
        
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
            <p>No historical interview or analysis configurations populated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-slate-50 rounded-lg px-2 transition-colors -mx-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${session.session_type === 'interview' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                      {session.session_type === 'interview' ? 'Interview' : 'Analysis'}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 truncate">{session.resume_filename}</p>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Configured on {new Date(session.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                </div>
                <Link 
                  href={session.session_type === 'interview' ? `/dashboard/reports/${session.id}` : `/dashboard/interviews/${session.id}`}
                  className="text-xs font-semibold text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-200 bg-white hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-center"
                >
                  {session.session_type === 'interview' ? 'View Report' : 'View Analysis'} &rarr;
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