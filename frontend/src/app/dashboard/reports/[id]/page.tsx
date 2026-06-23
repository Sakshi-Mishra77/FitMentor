// frontend/src/app/dashboard/reports/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import api from "@/services/api";

interface Interaction {
  id: string;
  question: string;
  transcript: string;
  score: number;
  feedback: string;
}

interface ReportData {
  session: {
    id: string;
    interview_type: string;
    resume_filename: string;
  };
  metrics: {
    average_score: number;
    total_questions: number;
    valid_answers: number;
    skipped_questions: number;
  };
  interactions: Interaction[];
}

export default function PerformanceReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await api.get(`/interviews/${id}/report`);
        setReport(response.data);
      } catch (err: any) {
        setError("Unable to retrieve performance data. The session may not exist or has no recorded answers.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent mx-auto"></div></div>;
  if (error || !report) return <div className="max-w-md mx-auto text-center mt-20 p-8"><p className="mb-4 text-slate-600">{error}</p><Link href="/dashboard" className="text-teal-700 font-semibold hover:underline">Return to Dashboard</Link></div>;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold uppercase tracking-wider">{report.session.interview_type} Interview</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Performance Analytics</h1>
        </div>
        <Link href="/dashboard" className="inline-flex items-center justify-center bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
          Back to Dashboard
        </Link>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Overall Score</div>
          <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-[6px] border-teal-50">
            <div className={`text-2xl font-black ${report.metrics.average_score >= 70 ? 'text-teal-600' : report.metrics.average_score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
              {report.metrics.average_score}
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{report.metrics.total_questions}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Questions Asked</div>
          </div>
          <div className="h-12 w-px bg-slate-100"></div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{report.metrics.valid_answers}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Valid Answers</div>
          </div>
          <div className="h-12 w-px bg-slate-100"></div>
          <div className="text-center">
            <div className="text-3xl font-bold text-rose-500">{report.metrics.skipped_questions}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Skipped / Unknown</div>
          </div>
        </div>
      </div>

      {/* Question & Feedback Timeline */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 px-1">Detailed Breakdown</h2>
        
        {report.interactions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">No questions were answered during this session.</div>
        ) : (
          report.interactions.map((interaction, index) => (
            <div key={interaction.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              
              {/* Score Side-Panel */}
              <div className={`p-6 md:w-32 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 ${interaction.score >= 70 ? 'bg-teal-50/50' : interaction.score > 0 ? 'bg-amber-50/50' : 'bg-rose-50/50'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Q{index + 1} Score</span>
                <span className={`text-2xl font-black ${interaction.score >= 70 ? 'text-teal-600' : interaction.score > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {interaction.score}
                </span>
              </div>

              {/* Content Panel */}
              <div className="p-6 flex-1 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">The Question</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{interaction.question}</p>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Answer</span>
                  <p className="text-sm text-slate-700 mt-1 italic">&quot;{interaction.transcript}&quot;</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Feedback</span>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{interaction.feedback}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}