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

const scoreTone = (score: number) => {
  if (score >= 75) {
    return {
      badge: "text-emerald-700 bg-emerald-100 border-emerald-200",
      bar: "bg-emerald-500",
      label: "Strong",
    };
  }

  if (score >= 50) {
    return {
      badge: "text-amber-700 bg-amber-100 border-amber-200",
      bar: "bg-amber-500",
      label: "Moderate",
    };
  }

  return {
    badge: "text-rose-700 bg-rose-100 border-rose-200",
    bar: "bg-rose-500",
    label: "Needs Work",
  };
};

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
      } catch {
        setError("Unable to retrieve performance data. The session may not exist or has no recorded answers.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-4 text-slate-600">{error}</p>
        <Link href="/dashboard" className="font-semibold text-teal-700 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const completionRate =
    report.metrics.total_questions > 0
      ? Math.round((report.metrics.valid_answers / report.metrics.total_questions) * 100)
      : 0;

  const overallTone = scoreTone(report.metrics.average_score);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-white via-slate-50 to-teal-50 p-7 shadow-sm md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-teal-200/30 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-200/30 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Link href="/dashboard" className="transition-colors hover:text-slate-700">
                Workspace
              </Link>
              <span>/</span>
              <span>{report.session.interview_type} Interview</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Performance Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Structured review of interview outcomes, response quality, and scoring trends for this session.
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Average Score</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-black leading-none text-slate-900">{report.metrics.average_score}</span>
                <span className="mb-1 text-sm font-semibold text-slate-500">/100</span>
              </div>
            </div>
            <span className={`mb-1 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${overallTone.badge}`}>
              {overallTone.label}
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Questions Asked</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{report.metrics.total_questions}</p>
          <p className="mt-2 text-sm text-slate-600">Session scope</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Valid Answers</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{report.metrics.valid_answers}</p>
          <p className="mt-2 text-sm text-slate-600">Answered with substance</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Skipped / Unknown</p>
          <p className="mt-3 text-3xl font-bold text-rose-500">{report.metrics.skipped_questions}</p>
          <p className="mt-2 text-sm text-slate-600">Missed response opportunities</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Completion Rate</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{completionRate}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: `${completionRate}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">Response consistency</p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Detailed Breakdown</h2>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {report.interactions.length} Interactions
          </span>
        </div>

        {report.interactions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            No questions were answered during this session.
          </div>
        ) : (
          <div className="space-y-4">
            {report.interactions.map((interaction, index) => {
              const tone = scoreTone(interaction.score);
              const boundedScore = Math.max(0, Math.min(100, interaction.score));

              return (
                <article
                  key={interaction.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Question {index + 1}</p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">{interaction.question}</h3>
                      </div>

                      <div className="min-w-50">
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Score</span>
                          <span>{boundedScore}/100</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div
                            className={`h-2 rounded-full ${tone.bar}`}
                            style={{ width: `${boundedScore}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone.badge}`}>
                          {tone.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 md:p-6 lg:grid-cols-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Your Answer</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {interaction.transcript ? interaction.transcript : "No spoken answer was captured for this prompt."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">AI Feedback</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{interaction.feedback}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}