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

  // AV State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null); 
  const [mediaError, setMediaError] = useState("");
  
  // Autonomous Loop & Audio State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const currentQuestionRef = useRef<string>(""); 
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<"setup" | "ongoing" | "evaluating" | "complete">("setup");
  
  // Timer & Exit Modal
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); 
  
  const promptCountRef = useRef(0);
  const isRepromptingRef = useRef(false);

  const statusRef = useRef(interviewStatus);
  const isListeningRef = useRef(isListening);
  const isSpeakingRef = useRef<boolean>(false);
  const silenceStartRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>(0);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => { 
    statusRef.current = interviewStatus; 
    if (interviewStatus === "complete") {
      endMediaSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewStatus]);
  
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (interviewStatus === "ongoing" || interviewStatus === "evaluating") {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [interviewStatus]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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

  const cleanupAudio = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      cleanupAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const assignRandomVoice = () => {
      if (selectedVoiceRef.current) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const englishVoices = voices.filter(v => v.lang.startsWith("en"));
      const localVoices = englishVoices.filter(v => v.localService);
      const pool = localVoices.length > 0 ? localVoices : englishVoices;

      if (pool.length > 0) {
        selectedVoiceRef.current = pool.find(v => v.name.toLowerCase().includes('female')) || pool[0];
      }
    };
    
    if (typeof window !== "undefined" && window.speechSynthesis) {
      assignRandomVoice();
      window.speechSynthesis.onvoiceschanged = assignRandomVoice;
    }
  }, []);

  const monitorSilence = () => {
    if (!isListeningRef.current || !analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    
    if (average > 15) { 
      isSpeakingRef.current = true;
      silenceStartRef.current = Date.now();
    } else {
      const timeSilent = Date.now() - silenceStartRef.current;
      
      if (isSpeakingRef.current && timeSilent > 8000) {
        stopListeningAndSubmit();
        return;
      }

      if (!isSpeakingRef.current && timeSilent > 12000) {
        if (promptCountRef.current < 2) {
          promptCountRef.current += 1;
          triggerReprompt();
          return;
        } else {
          stopListeningAndSubmit(); 
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(monitorSilence);
  };

  const triggerReprompt = () => {
    isRepromptingRef.current = true; 
    const prompts = [
      "Take your time. Let me know your thoughts whenever you are ready.",
      "I'm still here. Feel free to take a few more seconds to think it through."
    ];
    speakText(prompts[promptCountRef.current - 1]); 
  };

  const startListening = () => {
    setIsListening(true);
    isListeningRef.current = true; 
    setInterviewStatus("ongoing");
    statusRef.current = "ongoing"; 
    setTranscript("");
    
    audioChunksRef.current = [];
    isSpeakingRef.current = false;
    silenceStartRef.current = Date.now();

    const currentStream = streamRef.current;
    if (!currentStream) return;

    try {
      const mediaRecorder = new MediaRecorder(currentStream);
      mediaRecorderRef.current = mediaRecorder;

      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (isRepromptingRef.current) {
          isRepromptingRef.current = false;
          return; 
        }
        const blobType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        await submitAudioBlob(audioBlob, ext);
      };

      mediaRecorder.start(1000);

      if (audioContextRef.current && !analyserRef.current) {
        let isolatedStream = currentStream;
        try { isolatedStream = currentStream.clone(); } catch (e) {}

        const source = audioContextRef.current.createMediaStreamSource(isolatedStream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        source.connect(analyserRef.current);
      }

      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(console.warn);
      }

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      monitorSilence();

    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setTranscript("Audio recording error. The browser could not mount the recording engine.");
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListeningAndSubmit = () => {
    if (statusRef.current === "evaluating" || statusRef.current === "complete") return;
    
    setIsListening(false);
    isListeningRef.current = false;
    setInterviewStatus("evaluating");
    statusRef.current = "evaluating";
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); 
    }
  };

  const submitAudioBlob = async (audioBlob: Blob, ext: string = 'webm') => {
    const formData = new FormData();
    formData.append("question", currentQuestionRef.current || "Unknown question");
    
    const finalBlob = audioBlob.size > 0 ? audioBlob : new Blob(["empty"], { type: "text/plain" });
    formData.append("audio", finalBlob, `answer.${ext}`);

    try {
      const res = await api.post(`/interviews/${id}/answer`, formData);
      
      setTranscript(res.data.transcript);

      // THE FIX: Intercept the Pause status from the backend
      if (res.data.status === "pause") {
        setInterviewStatus("ongoing");
        statusRef.current = "ongoing";
        speakText(res.data.acknowledgement);
        return; // Break early! Do not fetch the next question.
      }

      const acknowledgement = res.data.evaluation?.acknowledgement || "";
      fetchNextQuestion(acknowledgement);
    } catch (err) {
      console.error("Failed to submit audio blob to backend.", err);
      fetchNextQuestion("I missed that."); 
    }
  };

  const speakText = (text: string) => {
    setIsListening(false);
    isListeningRef.current = false;
    cleanupAudio();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume(); 
      window.speechSynthesis.cancel(); 
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance; 
        
        utterance.rate = 1.0; 
        utterance.lang = "en-US";
        if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
        
        utterance.onend = () => {
          if (statusRef.current === "ongoing") startListening();
        };

        utterance.onerror = (e) => {
          if (e.error === "interrupted") return;
          console.error("Speech Synthesis Failed:", e.error);
          if (statusRef.current === "ongoing") startListening();
        };

        window.speechSynthesis.speak(utterance);
      }, 100);
    } else {
       if (statusRef.current === "ongoing") startListening();
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

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.resume(); 
        const unlockUtterance = new SpeechSynthesisUtterance("");
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = mediaStream; 
      setStream(mediaStream);

      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

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
        statusRef.current = "complete";
      } else {
        setCurrentQuestion(prefixAcknowledgement ? `${prefixAcknowledgement} ${res.data.question}` : res.data.question);
        setInterviewStatus("ongoing");
        statusRef.current = "ongoing";
      }
    } catch (err) {
      console.error("Failed to load question pipeline.", err);
    }
  };

  const endMediaSession = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    cleanupAudio();
    setStream(null);
  };

  const handleDownloadPDF = async () => {
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
    }
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent mx-auto"></div></div>;
  if (error || !session) return <div className="max-w-md mx-auto text-center mt-20 p-8"><p className="mb-4 text-slate-600">{error}</p><Link href="/dashboard" className="text-slate-900 font-semibold hover:underline">Return to Dashboard</Link></div>;

  if (session.session_type === "interview") {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        
        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-2">End Interview?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to exit the chamber? Your progress so far has been saved, and you will be redirected to your performance analytics.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowExitConfirm(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <Link href={`/dashboard/reports/${id}`} onClick={endMediaSession} className="px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm">End & View Report</Link>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Interview Chamber</h1>
            {(interviewStatus === "ongoing" || interviewStatus === "evaluating") && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-sm font-bold border border-rose-100 shadow-sm">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                <span className="font-mono tracking-widest">{formatTime(secondsElapsed)}</span>
              </div>
            )}
          </div>
          <button onClick={() => setShowExitConfirm(true)} className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors">Exit Session</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            <div className="aspect-video bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-sm border border-slate-200 relative overflow-hidden">
              {interviewStatus === "complete" ? (
                <div className="absolute inset-0 bg-slate-900 z-30 flex flex-col items-center justify-center w-full h-full">
                  <div className="h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Interview Concluded</h2>
                  <p className="text-slate-400 text-sm mb-6 max-w-xs text-center">Your responses have been saved and analyzed. You can now safely view your results.</p>
                  <Link href={`/dashboard/reports/${id}`} className="bg-white text-slate-900 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-100 transition-colors">
                    View Performance Report
                  </Link>
                </div>
              ) : stream ? (
                <>
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-semibold text-emerald-400 tracking-wider">WHISPER STT ACTIVE</span>
                  </div>
                  
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

                  {(interviewStatus === "ongoing" || interviewStatus === "evaluating") && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-40 transition-all">
                      {interviewStatus === "evaluating" ? (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent"></div>
                          Transcribing & Analyzing...
                        </div>
                      ) : isListening ? (
                        <div className="flex items-center gap-3 text-sm font-medium text-white">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "100ms" }}></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                          </div>
                          Recording
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

            {/* Information Note & Manual Submit */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Audio Capture Mode</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Speak naturally. The system automatically detects when you pause. You have 8 seconds to pause and think mid-answer. You can also click the button to submit manually.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={stopListeningAndSubmit} 
                disabled={!isListening}
                className="whitespace-nowrap px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                Submit Answer
              </button>
            </div>
          </div>

          {/* Right Column: Session Log */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-12rem)] min-h-[500px] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-900">Session Log</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-200/50 text-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${session.interview_type === 'hr' ? 'bg-blue-500' : 'bg-slate-800'}`}></span>
                  {session.interview_type === 'hr' ? 'Behavioral' : 'Technical'}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white scrollbar-thin">
                {!currentQuestion ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-slate-400 text-center">Log will populate once the interview starts.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-slate-600 text-[10px] font-bold">AI</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl rounded-tl-none text-sm text-slate-700 leading-relaxed">
                        {currentQuestion}
                      </div>
                    </div>

                    {(isListening || interviewStatus === "evaluating" || transcript) && (
                      <div className="flex gap-3 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">YOU</span>
                        </div>
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl rounded-tr-none text-sm leading-relaxed max-w-[85%]">
                          {isListening ? (
                            <span className="opacity-50 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Recording...
                            </span>
                          ) : interviewStatus === "evaluating" ? (
                            <span className="opacity-50">Transcribing...</span>
                          ) : (
                            transcript
                          )}
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
            <span className="text-slate-600 font-semibold truncate max-w-[200px]">{session.resume_filename}</span>
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
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{session.job_description ? session.missing_skills.length : 0} Missing</span>
                </div>
                {!session.job_description ? <p className="text-xs text-slate-400 italic leading-relaxed">General mode evaluation. Inject a job description target block to generate live gap logging analytics.</p> : session.missing_skills.length > 0 ? (
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
                <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-[6px] border-slate-100 shadow-inner"><div className="text-3xl font-black text-slate-800 tracking-tight">{session.job_description ? `${session.match_percentage}%` : "--"}</div></div>
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-4">{session.job_description && session.match_percentage > 75 ? "Highly Compatible" : session.job_description ? "Needs Calibration" : "Awaiting Context"}</div>
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs"><span className="text-slate-400">Mode:</span><span className="font-semibold text-slate-700">{session.job_description ? "Target Role Guided" : "General Ingestion"}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Total Vectors Mapped:</span><span className="font-semibold text-slate-700">{session.extracted_skills.length + (session.job_description ? session.missing_skills.length : 0)} Keynotes</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 rounded-2xl p-5 shadow-sm text-white">
            <div className="space-y-0.5"><h3 className="font-bold text-sm">ATS Compliant Output Schema</h3><p className="text-xs text-slate-400 leading-relaxed">Keywords embedded smoothly within your core configuration framework summaries.</p></div>
            <button onClick={handleDownloadPDF} className="inline-flex items-center justify-center whitespace-nowrap bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-full transition-colors shadow-sm gap-2">Download Document (PDF)</button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6 overflow-x-auto max-h-[65vh] font-mono text-[11px] text-slate-300 whitespace-pre leading-relaxed scrollbar-thin">{session.modified_resume_text}</div>
        </div>
      )}
    </div>
  );
}