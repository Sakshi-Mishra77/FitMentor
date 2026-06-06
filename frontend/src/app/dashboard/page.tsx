// frontend/src/app/dashboard/page.tsx
"use client";

import Link from "next/link";

export default function DashboardOverview() {
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
        <StatCard title="Interviews Completed" value="0" subtext="Lifetime sessions" />
        <StatCard title="Average Score" value="--" subtext="Out of 100" />
        <StatCard title="Identified Skill Gaps" value="0" subtext="Areas to improve" />
      </div>

      {/* Recent Activity Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
          <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p>No interviews completed yet.</p>
        </div>
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