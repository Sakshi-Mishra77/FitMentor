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
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 mb-4">
          <span>&larr;</span> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Mock Interview Setup</h1>
        <p className="mt-2 text-slate-600">Provide your resume and target role to start a tailored interview session.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">1. Upload Resume (PDF) <span className="text-red-500">*</span></label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${file ? "border-teal-200 bg-teal-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50"}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
              {file ? (
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-4 text-xs font-medium text-red-500">Remove File</button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-slate-900">Click to upload your resume</p>
                  <p className="text-xs text-slate-500 mt-1">This context helps the AI ask better questions</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">2. Target Job Description / Role</label>
            <textarea
              rows={6}
              className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none outline-none"
              placeholder="Paste the job description or role details to tailor the interview..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Preparing Interview..." : "Start Interview Room →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
