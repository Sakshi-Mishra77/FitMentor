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

  // AV State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  
  // Autonomous Loop State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<"setup" | "ongoing" | "evaluating" | "complete">("setup");
  
  const statusRef = useRef(interviewStatus);
  const transcriptRef = useRef("");
  const isListeningRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const promptCountRef = useRef(0);
  
  // Voice Persona State
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { statusRef.current = interviewStatus; }, [interviewStatus]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const clearAllTimers = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      clearAllTimers();
    };
  }, [stream]);

  // Voice Assignment Randomizer
  useEffect(() => {
    const assignRandomVoice = () => {
      if (selectedVoiceRef.current) return;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const englishVoices = voices.filter(v => v.lang.startsWith("en"));
      if (englishVoices.length > 0) {
        const maleKeywords = ['male', 'daniel', 'alex', 'david', 'arthur', 'george', 'mark', 'aaron'];
        const femaleKeywords = ['female', 'samantha', 'victoria', 'karen', 'zira', 'tessa', 'moira', 'hazel', 'catherine'];

        const males = englishVoices.filter(v => maleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
        const females = englishVoices.filter(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));

        let selectedPool = englishVoices; 

        if (males.length > 0 && females.length > 0) {
          selectedPool = Math.random() > 0.5 ? males : females;
        }

        selectedVoiceRef.current = selectedPool[Math.floor(Math.random() * selectedPool.length)];
      }
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      assignRandomVoice();
      window.speechSynthesis.onvoiceschanged = assignRandomVoice;
    }
  }, []);

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
          transcriptRef.current = currentTranscript;
          clearAllTimers();

          const lowerTranscript = currentTranscript.toLowerCase();
          const skipKeywords = ["skip", "next question", "move on", "don't know", "do not know", "unable to answer", "cannot answer", "can't answer"];
          if (skipKeywords.some(kw => lowerTranscript.includes(kw))) {
            submitAnswer();
            return;
          }

          pauseTimerRef.current = setTimeout(() => { submitAnswer(); }, 3500);
        };

        speechRecognitionRef.current.onend = () => {
          if (statusRef.current === "ongoing" && isListeningRef.current) {
            try { speechRecognitionRef.current?.start(); } catch (e) {}
          }
        };
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = async () => {
    if (statusRef.current === "evaluating" || statusRef.current === "complete") return;
    
    setIsListening(false);
    setInterviewStatus("evaluating");
    clearAllTimers();

    try { speechRecognitionRef.current?.stop(); } catch (e) {}

    try {
      const res = await api.post(`/interviews/${id}/answer`, {
        question: currentQuestion,
        transcript: transcriptRef.current || "User skipped or provided no response."
      });
      
      setTranscript("");
      transcriptRef.current = "";
      const acknowledgement = res.data.evaluation.acknowledgement || "";
      fetchNextQuestion(acknowledgement);
    } catch (err) {
      console.error("Failed to submit transcript.", err);
      fetchNextQuestion("I missed that."); 
    }
  };

  const startListening = () => {
    setTranscript("");
    transcriptRef.current = "";
    setIsListening(true);
    clearAllTimers();

    try { speechRecognitionRef.current?.start(); } catch (e) {}

    silenceTimerRef.current = setTimeout(() => {
      if (!transcriptRef.current.trim() && statusRef.current === "ongoing") {
        promptCountRef.current += 1;
        if (promptCountRef.current >= 3) {
          transcriptRef.current = "User did not respond after multiple prompts.";
          submitAnswer();
        } else {
          speakText("Take your time. Let me know your thoughts whenever you are ready.", true);
        }
      }
    }, 7000);
  };

  const speakText = (text: string, isPrompt: boolean = false) => {
    setIsListening(false);
    clearAllTimers();
    try { speechRecognitionRef.current?.stop(); } catch (e) {}

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); 
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.rate = 0.95; 
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
      
      utterance.onend = () => {
        if (statusRef.current === "ongoing" || isPrompt) startListening();
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (currentQuestion && (interviewStatus === "ongoing" || interviewStatus === "complete")) {
      speakText(currentQuestion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  const enableMediaHardware = async () => {
    try {
      setMediaError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      fetchNextQuestion(""); 
    } catch (err: any) {
      setMediaError("Camera and microphone permissions were denied.");
    }
  };

  const fetchNextQuestion = async (prefixAcknowledgement: string = "") => {
    try {
      promptCountRef.current = 0;
      const res = await api.get(`/interviews/${id}/next-question`);
      if (res.data.status === "complete") {
        setCurrentQuestion(prefixAcknowledgement ? `${prefixAcknowledgement} That concludes our interview session.` : "That concludes our interview session.");
        setInterviewStatus("complete");
      } else {
        setCurrentQuestion(prefixAcknowledgement ? `${prefixAcknowledgement} ${res.data.question}` : res.data.question);
        setInterviewStatus("ongoing");
      }
    } catch (err) {
      console.error("Failed to load question pipeline.", err);
    }
  };

  const endMediaSession = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    clearAllTimers();
    setStream(null);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/sessions/${id}/download-resume`, { responseType: "blob" });
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

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mx-auto"></div></div>;
  if (error || !session) return <div className="max-w-md mx-auto text-center mt-20 p-8"><p className="mb-4 text-slate-600">{error}</p><Link href="/dashboard" className="text-slate-900 font-semibold hover:underline">Return to Dashboard</Link></div>;

  const isJdBased = session.job_description.trim().length > 0;

  // ==========================================
  // VIEW 1: LIVE INTERVIEW ROOM
  // ==========================================
  if (session.session_type === "interview") {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Interview Chamber</h1>
          <Link href="/dashboard" onClick={endMediaSession} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Exit Session
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Video & Controls */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Video Container */}
            <div className="aspect-video bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-sm border border-slate-200 relative overflow-hidden">
              {stream ? (
                <>
                  {/* Stable Connection Badge */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-semibold text-emerald-400 tracking-wider">SECURE CONNECTION</span>
                  </div>
                  
                  {/* Concluded Session Screen overlay */}
                  {interviewStatus === "complete" && (
                    <div className="absolute inset-0 bg-slate-900 z-30 flex flex-col items-center justify-center">
                      <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Interview Concluded</h2>
                      <p className="text-slate-400 text-sm mb-6 max-w-xs text-center">Your responses have been saved. You can now safely exit.</p>
                      <Link href="/dashboard" onClick={endMediaSession} className="bg-white text-slate-900 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-100 transition-colors">
                        View Dashboard
                      </Link>
                    </div>
                  )}

                  {/* Clean camera feed stream completely unblocked by massive overlays */}
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

                  {/* Combined Spontaneous Status Indicator Strip */}
                  {(interviewStatus === "ongoing" || interviewStatus === "evaluating") && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-40 transition-all">
                      {interviewStatus === "evaluating" ? (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent"></div>
                          Processing...
                        </div>
                      ) : isListening ? (
                        <div className="flex items-center gap-3 text-sm font-medium text-white">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "100ms" }}></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                          </div>
                          Listening
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                          <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse"></div>
                          Interviewer is speaking
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-medium">Ready to begin?</h3>
                    <p className="text-slate-400 text-sm max-w-xs mt-1">We require camera and microphone access to start the simulation.</p>
                  </div>
                  <button onClick={enableMediaHardware} className="mt-2 bg-white text-slate-900 px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-200 transition-colors">
                    Enable Hardware
                  </button>
                </div>
              )}
            </div>

            {/* Information Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Autonomous Flow</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Speak naturally. The system automatically detects when you finish. If you need to bypass a question, simply say <strong>"skip"</strong> or <strong>"move on"</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Transcript & Context Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-12rem)] min-h-[500px] flex flex-col overflow-hidden">
              
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-900">Live Transcript</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-200/50 text-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${session.interview_type === 'hr' ? 'bg-blue-500' : 'bg-slate-800'}`}></span>
                  {session.interview_type === 'hr' ? 'Behavioral' : 'Technical'}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white scrollbar-thin">
                {!currentQuestion ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-slate-400 text-center">Transcript will appear here once the interview starts.</p>
                  </div>
                ) : (
                  <>
                    {/* AI Message */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-slate-600 text-[10px] font-bold">AI</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl rounded-tl-none text-sm text-slate-700 leading-relaxed">
                        {currentQuestion}
                      </div>
                    </div>

                    {/* User Message */}
                    {(transcript || isListening) && (
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">YOU</span>
                        </div>
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl rounded-tr-none text-sm leading-relaxed max-w-[85%]">
                          {transcript || <span className="opacity-50">Listening...</span>}
                        </div>
                      </div>
                    )}
                  </>
                )}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Workspace</Link>
            <span>/</span>
            <span className="text-slate-660 font-semibold truncate max-w-[200px]">{session.resume_filename}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Optimization Matrix</h1>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-8 text-sm font-medium">
        <button onClick={() => setActiveTab("analysis")} className={`pb-4 border-b-2 transition-all relative ${activeTab === "analysis" ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Analysis Overview</button>
        <button onClick={() => setActiveTab("resume")} className={`pb-4 border-b-2 transition-all relative flex items-center gap-1.5 ${activeTab === "resume" ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <span>ATS Tailored Preview</span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">Draft</span>
        </button>
      </div>

      {activeTab === "analysis" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
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

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Gaps</h3>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{isJdBased ? session.missing_skills.length : 0} Missing</span>
                </div>
                {!isJdBased ? <p className="text-xs text-slate-400 italic leading-relaxed">General mode evaluation. Inject a job description target block to generate live gap logging analytics.</p> : session.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {session.missing_skills.map((skill) => <span key={skill} className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200/50 px-2 py-1 text-xs font-semibold text-amber-800">{skill}</span>)}
                  </div>
                ) : <p className="text-xs text-emerald-600 font-medium leading-relaxed bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">Complete alignment profile found across the given criteria.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Actionable Optimization Steps</h3>
              <div className="space-y-3">
                {session.ats_suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="p-4 flex items-start gap-3.5"><div className="text-sm text-slate-700 leading-relaxed font-medium">{suggestion}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-2xl p-5 shadow-sm text-white">
            <div className="space-y-0.5"><h3 className="font-bold text-sm">ATS Compliant Output Schema</h3><p className="text-xs text-slate-400 leading-relaxed">Keywords embedded smoothly within your core configuration framework summaries.</p></div>
            <button onClick={handleDownloadPDF} disabled={downloading} className="inline-flex items-center justify-center whitespace-nowrap bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-full transition-colors disabled:opacity-50 shadow-sm gap-2">{downloading ? "Compiling PDF Data..." : "Download Document (PDF)"}</button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6 overflow-x-auto max-h-[65vh] font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed scrollbar-thin">{session.modified_resume_text}</div>
        </div>
      )}
    </div>
  );
}