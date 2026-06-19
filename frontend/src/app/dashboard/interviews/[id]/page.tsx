// frontend/src/app/dashboard/interviews/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import api from "@/services/api";

interface SessionData {
  id: string;
  session_type?: "analysis" | "interview";
  interview_type?: "technical" | "hr"; // Add this line
  resume_filename: string;
  job_description: string;
  extracted_skills: string[];
  missing_skills: string[];
  match_percentage: number;
  ats_suggestions: string[];
  modified_resume_text: string;
}

export default function InterviewRoomSetup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Data state
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "resume">("analysis");
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Media Stream State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // Fetch Session Data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await api.get(`/sessions/${id}`);
        setSession(response.data);
      } catch (err: any) {
        setError("Unable to retrieve validation logs for this session mapping.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [id]);

  // Cleanup media tracks when the component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Safely attach the media stream to the video element once it mounts
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/sessions/${id}/download-resume`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Optimized_${session?.resume_filename || "Resume.pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to compile target PDF download pipeline stream.");
    } finally {
      setDownloading(false);
    }
  };

  // WebRTC Media Hardware Request
  const enableMediaHardware = async () => {
    try {
      setMediaError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Hardware access denied:", err);
      setMediaError("Camera and microphone permissions were denied. Please allow access in your browser settings.");
    }
  };

  const endMediaSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const response = await api.post(`/sessions/${id}/upload-resume`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Expect backend to return updated session object
      if (response.data) {
        setSession(response.data);
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      alert('Failed to upload resume.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const response = await api.post(`/sessions/${id}/upload-resume`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data) setSession(response.data);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50/50">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-900 mb-4">{error}</p>
        <Link href="/dashboard" className="inline-flex justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isJdBased = session.job_description.trim().length > 0;

  // ==========================================
  // VIEW 1: LIVE INTERVIEW ROOM
  // ==========================================
  if (session.session_type === "interview") {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
              <span>/</span>
              <span className="text-slate-600 font-semibold uppercase tracking-wider">Live Simulation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AI Interview Chamber</h1>
          </div>
          <Link 
            href="/dashboard" 
            onClick={endMediaSession}
            className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors bg-red-50 px-4 py-2 rounded-lg"
          >
            End Session
          </Link>
        </div>

        {/* Media Chamber Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main AV Canvas */}
          <div className="lg:col-span-2 aspect-video bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg border border-slate-800 relative overflow-hidden group">
            
            {stream ? (
              <>
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold tracking-wider text-emerald-400">SECURE CONNECTION</span>
                </div>
                
                {/* IMPORTANT: muted={true} is required so the user doesn't hear an echo of their own microphone.
                  The backend/WebRTC stream will still capture the audio securely.
                */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100" // scale-x-100 creates a mirror effect
                />

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                  <button onClick={() => setIsRecording(!isRecording)} className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white' : 'bg-white text-slate-900'}`}>
                    <div className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`}></div>
                    {isRecording ? "Stop AI Analysis" : "Start Answering"}
                  </button>
                  <button onClick={endMediaSession} className="text-white hover:text-red-400 transition-colors p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-5 p-6">
                <div className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700 shadow-inner">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Camera & Microphone Access</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">The AI requires your media stream to analyze your communication patterns, confidence, and speech.</p>
                </div>
                {mediaError && (
                  <div className="bg-red-500/20 text-red-400 text-xs p-3 rounded-lg border border-red-500/30 max-w-sm mx-auto">
                    {mediaError}
                  </div>
                )}
                <button 
                  onClick={enableMediaHardware}
                  className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-teal-900/20 transition-all active:scale-95"
                >
                  Enable Hardware
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span> Interview Context
              </h3>
              <div className="space-y-5">
                {/* NEW TRACK DISPLAY */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Execution Track</p>
                  <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3">
                    <div className={`h-2 w-2 rounded-full ${session.interview_type === "hr" ? "bg-blue-400" : "bg-teal-400"}`}></div>
                    <span className="text-sm text-white font-semibold">
                      {session.interview_type === "hr" ? "HR & Behavioral" : "Technical Framework"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Resume Configured</p>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 font-medium">
                    <div className="truncate mr-3">{session.resume_filename || 'No resume uploaded'}</div>
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} onChange={handleUploadChange} accept=".pdf,.doc,.docx" type="file" className="hidden" />
                      <button onClick={triggerUpload} disabled={uploading} title="Upload resume" className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-100 text-slate-700">
                        {uploading ? (
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4-4-4M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/></svg>
                            <span className="text-xs font-semibold">Upload</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role / Job Description</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 font-medium line-clamp-4 leading-relaxed">
                    {session.job_description || "General Evaluation Mode"}
                  </div>
                </div>
              </div>
            </div>

            {/* DYNAMIC PRO TIP */}
            <div className="bg-teal-50 rounded-2xl border border-teal-100 p-6">
              <h3 className="text-sm font-bold text-teal-900 mb-2">Pro Tip</h3>
              <p className="text-xs text-teal-700 leading-relaxed">
                {session.interview_type === "hr" 
                  ? "Use the STAR method (Situation, Task, Action, Result) for behavioral questions. The AI will evaluate your communication structure."
                  : "Maintain eye contact and think aloud. The AI evaluates both your final technical answer and your logical problem-solving steps."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ATS RESUME ANALYSIS (Unchanged)
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate max-w-48">{session.resume_filename}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Optimization Matrix</h1>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-8 text-sm font-medium">
        <button onClick={() => setActiveTab("analysis")} className={`pb-4 border-b-2 transition-all relative ${activeTab === "analysis" ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Analysis Overview</button>
        <button onClick={() => setActiveTab("resume")} className={`pb-4 border-b-2 transition-all relative flex items-center gap-1.5 ${activeTab === "resume" ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <span>ATS Tailored Preview</span>
          <span className="inline-flex items-center rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-600/10">Draft</span>
        </button>
      </div>

      {activeTab === "analysis" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identified Strengths</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{session.extracted_skills.length} Found</span>
                </div>
                {session.extracted_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.extracted_skills.map((skill) => <span key={skill} className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/60 px-2 py-1 text-xs font-medium text-slate-700">{skill}</span>)}
                  </div>
                ) : <p className="text-xs text-slate-400 italic">No specialized core engineering keywords detected.</p>}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Gaps</h3>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{isJdBased ? session.missing_skills.length : 0} Missing</span>
                </div>
                {!isJdBased ? <p className="text-xs text-slate-400 italic leading-relaxed">General mode evaluation. Inject a job description target block to generate live gap logging analytics.</p> : session.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.missing_skills.map((skill) => <span key={skill} className="inline-flex items-center rounded-md bg-amber-50/60 border border-amber-200/50 px-2 py-1 text-xs font-semibold text-amber-800">{skill}</span>)}
                  </div>
                ) : <p className="text-xs text-emerald-600 font-medium leading-relaxed bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">✓ Complete alignment profile found across the given criteria.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actionable Optimization Steps</h3>
              <div className="space-y-3">
                {session.ats_suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className={`w-1.5 ${suggestion.includes('⚠️') ? 'bg-red-500' : suggestion.includes('⚡') ? 'bg-amber-400' : 'bg-teal-500'}`} />
                    <div className="p-4 flex items-start gap-3.5"><div className="text-sm text-slate-700 leading-relaxed font-medium">{suggestion}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div><h3 className="text-sm font-bold text-slate-900">Parsing Match Yield</h3><p className="text-xs text-slate-400 mt-0.5">Calculated vector density vs role constraints.</p></div>
              <div className="py-6 flex flex-col items-center justify-center border-y border-slate-100">
                <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-[6px] border-slate-100 shadow-inner"><div className="text-3xl font-black text-slate-800 tracking-tight">{isJdBased ? `${session.match_percentage}%` : "--"}</div></div>
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-4">{isJdBased && session.match_percentage > 75 ? "Highly Compatible" : isJdBased ? "Needs Calibration" : "Awaiting Context"}</div>
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs"><span className="text-slate-400">Mode:</span><span className="font-semibold text-slate-700">{isJdBased ? "Target Role Guided" : "General Ingestion"}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Total Vectors Mapped:</span><span className="font-semibold text-slate-700">{session.extracted_skills.length + (isJdBased ? session.missing_skills.length : 0)} Keynotes</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-xl p-5 shadow-sm text-white">
            <div className="space-y-0.5"><h3 className="font-bold text-sm">ATS Compliant Output Schema</h3><p className="text-xs text-slate-400 leading-relaxed">Keywords embedded smoothly within your core configuration framework summaries.</p></div>
            <button onClick={handleDownloadPDF} disabled={downloading} className="inline-flex items-center justify-center whitespace-nowrap bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm gap-2">{downloading ? "Compiling PDF Data..." : "Download Document (PDF)"}</button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl p-6 overflow-x-auto max-h-[65vh] font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed scrollbar-thin">{session.modified_resume_text}</div>
        </div>
      )}
    </div>
  );
}