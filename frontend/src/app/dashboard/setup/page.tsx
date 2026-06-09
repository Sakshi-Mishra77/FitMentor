// frontend/src/app/dashboard/setup/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";

export default function SetupSessionPage() {
  const router = useRouter();
  
  // State for our form
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // State for submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Please upload a valid PDF file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  // --- Form Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload your resume to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // We use FormData because we are sending a File to the backend
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);

      // We will build this backend endpoint next!
      // const response = await api.post("/sessions/setup", formData);
      
      // Simulate network delay for now to see the UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // router.push(`/dashboard/interviews/${response.data.session_id}`);
      alert("This will route to the interview session once the backend is ready!");
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to setup session.");
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
        <h1 className="text-3xl font-bold text-slate-900">Configure Interview</h1>
        <p className="mt-2 text-slate-600">Upload your context so our AI can tailor your mock interview.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* 1. Resume Upload Zone */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              1. Upload Resume (PDF) <span className="text-red-500">*</span>
            </label>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragging ? "border-teal-500 bg-teal-50" : file ? "border-teal-200 bg-teal-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden" 
              />
              
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-3">
                    <DocumentCheckIcon />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-4 text-xs font-medium text-red-500 hover:text-red-700">
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <UploadIcon />
                  </div>
                  <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">PDF up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Job Description Area */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-semibold text-slate-900">
                2. Target Job Description
              </label>
              <span className="text-xs text-slate-500">Optional but recommended</span>
            </div>
            <textarea
              rows={6}
              className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none transition-colors"
              placeholder="Paste the job description or requirements here. This helps the AI ask specific, role-relevant questions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <hr className="border-slate-100" />

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerIcon /> Processing Context...
                </>
              ) : (
                "Generate Interview Session →"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// --- Micro Icons ---
function UploadIcon() { return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>; }
function DocumentCheckIcon() { return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function SpinnerIcon() { return <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>; }