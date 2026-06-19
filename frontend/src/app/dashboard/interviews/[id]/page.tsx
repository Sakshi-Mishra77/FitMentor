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
      } else {
        console.error("Speech Recognition API not supported in this browser. Please use Chrome/Edge.");
      }
    }
  }, []);

  const enableMediaHardware = async () => {
    try {
      setMediaError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      fetchNextQuestion(); // Start the interview once hardware is active
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
      // STOP listening and SUBMIT
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
      // START listening
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
  if (error || !session) return <div className="max-w-md mx-auto text-center mt-20 p-8"><p>{error}</p><Link href="/dashboard" className="text-teal-600 underline">Return to Dashboard</Link></div>;

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

                {/* Subtitle Overlay: AI Question */}
                {currentQuestion && interviewStatus === "ongoing" && (
                  <div className="absolute top-16 w-full px-8 z-20 flex justify-center">
                    <div className="bg-black/70 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center max-w-xl shadow-xl text-lg font-medium leading-relaxed">
                      {currentQuestion}
                    </div>
                  </div>
                )}

                {/* Subtitle Overlay: Live Transcript */}
                {isListening && (
                  <div className="absolute bottom-24 w-full px-8 z-20 flex justify-center">
                    <div className="bg-slate-900/80 backdrop-blur-sm text-teal-300 text-sm font-mono px-6 py-3 rounded-xl border border-teal-500/30 max-w-xl text-center shadow-lg">
                      {transcript || "Listening..."}
                    </div>
                  </div>
                )}
                
                {/* Processing Overlay */}
                {interviewStatus === "evaluating" && (
                  <div className="absolute inset-0 bg-slate-900/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mb-4"></div>
                    <p className="text-sm font-bold text-white tracking-widest uppercase">Analyzing Response Metrics...</p>
                  </div>
                )}
                
                {/* Completion Overlay */}
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

                {/* Interaction Controls */}
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
  // VIEW 2: ATS RESUME ANALYSIS
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      <div className="flex justify-between border-b border-slate-200/80 pb-6">
        <h1 className="text-3xl font-bold text-slate-900">Optimization Matrix</h1>
      </div>
      <p className="text-slate-500">Analysis tools loaded correctly.</p>
    </div>
  );
}