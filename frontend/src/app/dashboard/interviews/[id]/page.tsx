// frontend/src/app/dashboard/interviews/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import api from "@/services/api";

interface SessionData {
  id: string;
  session_type?: "analysis" | "interview";
  interview_type?: "technical" | "hr";
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

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "resume">("analysis");
  const [downloading, setDownloading] = useState(false);

  // Media & Interview State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  
  // Interactive Loop State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<"setup" | "ongoing" | "evaluating" | "complete">("setup");
  
  const speechRecognitionRef = useRef<any>(null);

  // 1. Initial Data Load
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

  // 2. Hardware Mount & Cleanup
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    };
  }, [stream]);

  // 3. Initialize Speech Recognition Subsystem
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        speechRecognitionRef.current = new SpeechRecognitionAPI();
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = true;

        speechRecognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };
      }
    }
  }, []);

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

  const enableMediaHardware = async () => {
    try {
      setMediaError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      fetchNextQuestion(); 
    } catch (err: any) {
      setMediaError("Camera and microphone permissions were denied.");
    }
  };

  const fetchNextQuestion = async () => {
    try {
      const res = await api.get(`/interviews/${id}/next-question`);
      if (res.data.status === "complete") {
        setInterviewStatus("complete");
      } else {
        setCurrentQuestion(res.data.question);
        setInterviewStatus("ongoing");
      }
    } catch (err) {
      console.error("Failed to load question pipeline.", err);
    }
  };

  const handleAudioToggle = async () => {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      setInterviewStatus("evaluating");
      
      try {
        await api.post(`/interviews/${id}/answer`, {
          question: currentQuestion,
          transcript: transcript || "No audible response detected."
        });
        setTranscript("");
        fetchNextQuestion();
      } catch (err) {
        console.error("Failed to submit transcript.", err);
      }
    } else {
      setTranscript("");
      speechRecognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const endMediaSession = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent mx-auto"></div></div>;
  if (error || !session) return <div className="max-w-md mx-auto text-center mt-20 p-8"><p className="mb-4">{error}</p><Link href="/dashboard" className="text-teal-600 underline">Return to Dashboard</Link></div>;

  const isJdBased = session.job_description.trim().length > 0;

  // ==========================================
  // VIEW 1: LIVE INTERVIEW ROOM
  // ==========================================
  if (session.session_type === "interview") {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        <div className="flex justify-between border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">AI Interview Chamber</h1>
          </div>
          <Link href="/dashboard" onClick={endMediaSession} className="text-sm font-semibold text-red-500 bg-red-50 px-4 py-2 rounded-lg">End Session</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main AV Canvas */}
          <div className="lg:col-span-2 aspect-video bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-lg border border-slate-800 relative overflow-hidden group">
            {stream ? (
              <>
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-400">SECURE CONNECTION</span>
                </div>

                {currentQuestion && interviewStatus === "ongoing" && (
                  <div className="absolute top-16 w-full px-8 z-20 flex justify-center">
                    <div className="bg-black/70 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center max-w-xl shadow-xl text-lg font-medium leading-relaxed">
                      {currentQuestion}
                    </div>
                  </div>
                )}

                {isListening && (
                  <div className="absolute bottom-24 w-full px-8 z-20 flex justify-center">
                    <div className="bg-slate-900/80 backdrop-blur-sm text-teal-300 text-sm font-mono px-6 py-3 rounded-xl border border-teal-500/30 max-w-xl text-center shadow-lg">
                      {transcript || "Listening..."}
                    </div>
                  </div>
                )}
                
                {interviewStatus === "evaluating" && (
                  <div className="absolute inset-0 bg-slate-900/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mb-4"></div>
                    <p className="text-sm font-bold text-white tracking-widest uppercase">Analyzing Response Metrics...</p>
                  </div>
                )}
                
                {interviewStatus === "complete" && (
                  <div className="absolute inset-0 bg-teal-900/90 z-30 flex flex-col items-center justify-center backdrop-blur-md">
                    <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Interview Complete</h2>
                    <p className="text-teal-200 mb-8 max-w-sm text-center">Your responses have been logged and processed. You can now view your comprehensive performance report.</p>
                    <button onClick={endMediaSession} className="bg-white text-teal-900 px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-100">
                      View Final Report &rarr;
                    </button>
                  </div>
                )}

                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

                {interviewStatus === "ongoing" && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 z-40">
                    <button onClick={handleAudioToggle} className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-900 hover:bg-slate-200'}`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-white' : 'bg-red-500'}`}></div>
                      {isListening ? "Finish Answer" : "Begin Speaking"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center space-y-5 p-6">
                {mediaError && <p className="text-red-400 text-sm max-w-xs">{mediaError}</p>}
                <button onClick={enableMediaHardware} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all">
                  Enable Hardware
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Interview Context</h3>
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Execution Track</p>
                  <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3">
                    <div className={`h-2 w-2 rounded-full ${session.interview_type === "hr" ? "bg-blue-400" : "bg-teal-400"}`}></div>
                    <span className="text-sm text-white font-semibold">{session.interview_type === "hr" ? "HR & Behavioral" : "Technical Framework"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ATS RESUME ANALYSIS (Restored!)
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      
      {/* 1. PREMIUM BREADCRUMB & METADATA HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate max-w-[200px]">{session.resume_filename}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Optimization Matrix</h1>
        </div>
      </div>

      {/* 2. TAB CONTROLS */}
      <div className="flex border-b border-slate-200 gap-8 text-sm font-medium">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`pb-4 border-b-2 transition-all relative ${
            activeTab === "analysis" 
              ? "border-slate-900 text-slate-900 font-semibold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Analysis Overview
        </button>
        <button
          onClick={() => setActiveTab("resume")}
          className={`pb-4 border-b-2 transition-all relative flex items-center gap-1.5 ${
            activeTab === "resume" 
              ? "border-slate-900 text-slate-900 font-semibold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <span>ATS Tailored Preview</span>
          <span className="inline-flex items-center rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-inset ring-teal-600/10">Draft</span>
        </button>
      </div>

      {/* 3. DYNAMIC TAB RENDER LOOP */}
      {activeTab === "analysis" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT CONTENT DECK */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Strengths */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identified Strengths</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{session.extracted_skills.length} Found</span>
                </div>
                {session.extracted_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.extracted_skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/60 px-2 py-1 text-xs font-medium text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specialized core engineering keywords detected.</p>
                )}
              </div>

              {/* Gaps */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Gaps</h3>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{isJdBased ? session.missing_skills.length : 0} Missing</span>
                </div>
                {!isJdBased ? (
                  <p className="text-xs text-slate-400 italic leading-relaxed">General mode evaluation. Inject a job description target block to generate live gap logging analytics.</p>
                ) : session.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.missing_skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-amber-50/60 border border-amber-200/50 px-2 py-1 text-xs font-semibold text-amber-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium leading-relaxed bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">✓ Complete alignment profile found across the given criteria.</p>
                )}
              </div>

            </div>

            {/* Suggestions */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actionable Optimization Steps</h3>
              <div className="space-y-3">
                {session.ats_suggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-colors"
                  >
                    <div className={`w-1.5 ${suggestion.includes('⚠️') ? 'bg-red-500' : suggestion.includes('⚡') ? 'bg-amber-400' : 'bg-teal-500'}`} />
                    <div className="p-4 flex items-start gap-3.5">
                      <div className="text-sm text-slate-700 leading-relaxed font-medium">{suggestion}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PANEL */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Parsing Match Yield</h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculated vector density vs role constraints.</p>
              </div>

              <div className="py-6 flex flex-col items-center justify-center border-y border-slate-100">
                <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-[6px] border-slate-100 shadow-inner">
                  <div className="text-3xl font-black text-slate-800 tracking-tight">
                    {isJdBased ? `${session.match_percentage}%` : "--"}
                  </div>
                </div>
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-4">
                  {isJdBased && session.match_percentage > 75 ? "Highly Compatible" : isJdBased ? "Needs Calibration" : "Awaiting Context"}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Mode:</span>
                  <span className="font-semibold text-slate-700">{isJdBased ? "Target Role Guided" : "General Ingestion"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Vectors Mapped:</span>
                  <span className="font-semibold text-slate-700">{session.extracted_skills.length + (isJdBased ? session.missing_skills.length : 0)} Keynotes</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        // RESUME TEXT PREVIEW WORKSPACE
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-xl p-5 shadow-sm text-white">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm">ATS Compliant Output Schema</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Keywords embedded smoothly within your core configuration framework summaries.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center justify-center whitespace-nowrap bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm gap-2"
            >
              {downloading ? "Compiling PDF Data..." : "Download Document (PDF)"}
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl p-6 overflow-x-auto max-h-[65vh] font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed scrollbar-thin">
            {session.modified_resume_text}
          </div>
        </div>
      )}

    </div>
  );
}