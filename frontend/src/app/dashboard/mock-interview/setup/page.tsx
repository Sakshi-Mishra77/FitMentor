// frontend/src/app/dashboard/mock-interview/setup/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import api from "@/services/api";

export default function MockInterviewSetupPage() {
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [interviewType, setInterviewType] = useState<"technical" | "hr">("technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload your resume to provide context for the interview.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);
      formData.append("session_type", "interview");
      formData.append("interview_type", interviewType); // Added our new parameter

      const response = await api.post("/sessions/setup", formData);
      router.push(`/dashboard/interviews/${response.data.session_id}`);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(message || "Failed to setup interview session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 mb-4">
          <span>&larr;</span> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Mock Interview Configuration</h1>
        <p className="mt-2 text-slate-600">Select your interview track and provide your resume to calibrate the AI evaluator.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 font-medium">{error}</div>}

          {/* 1. Interview Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-4">1. Select Interview Track <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Technical Option */}
              <div 
                onClick={() => setInterviewType("technical")}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${interviewType === "technical" ? "border-teal-500 bg-teal-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                {interviewType === "technical" && (
                  <div className="absolute top-4 right-4 h-5 w-5 bg-teal-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                )}
                <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Technical Evaluation</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">Focuses on domain-specific engineering concepts, system architecture, tools, and technical problem-solving.</p>
              </div>

              {/* HR / Behavioral Option */}
              <div 
                onClick={() => setInterviewType("hr")}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${interviewType === "hr" ? "border-teal-500 bg-teal-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                {interviewType === "hr" && (
                  <div className="absolute top-4 right-4 h-5 w-5 bg-teal-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                )}
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">HR & Behavioral</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">Focuses on cultural fit, teamwork, leadership, conflict resolution, and past situational experiences.</p>
              </div>

            </div>
          </div>

          <hr className="border-slate-100" />

          {/* 2. Upload Context */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">2. Upload Resume Context (PDF) <span className="text-red-500">*</span></label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? "border-teal-200 bg-teal-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50"}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
              {file ? (
                <div className="flex flex-col items-center">
                  <p className="text-sm font-bold text-teal-700">{file.name}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-3 text-xs font-bold text-red-500 hover:text-red-600">Remove Document</button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-slate-900">Click to upload your resume</p>
                  <p className="text-xs text-slate-500 mt-1">This file provides the knowledge base for the AI's personalized questions.</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. JD Mapping */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">3. Target Job Description (Optional but Recommended)</label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none outline-none"
              placeholder="Paste the job description or specific company role details to tailor the questions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-lg bg-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-teal-500 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? "Calibrating AI Framework..." : "Launch Interview Chamber →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}