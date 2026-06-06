import Link from "next/link";
import type { ReactNode } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-200">
      
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 font-bold text-white">
              AI
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              FitMentor
            </span>
          </div>
          
          {/* Desktop Center Links */}
          <div className="hidden md:flex gap-8 font-medium text-sm text-slate-600">
            <Link href="#features" className="hover:text-teal-600 transition-colors">Features</Link>
            <Link href="#workflow" className="hover:text-teal-600 transition-colors">How it Works</Link>
            <Link href="#" className="hover:text-teal-600 transition-colors">About</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold leading-6 text-slate-700 hover:text-teal-600 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. SPLIT HERO SECTION */}
      <main className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
              Master the Interview. <br />
              <span className="text-teal-600">Land the Job.</span>
            </h1>
            
            <ul className="space-y-3 mb-8 text-lg font-medium text-slate-700">
              <li className="flex items-center gap-3"><CheckIcon /> Upload Context & Resumes.</li>
              <li className="flex items-center gap-3"><CheckIcon /> Practice Live Mock Interviews.</li>
              <li className="flex items-center gap-3"><CheckIcon /> Track Performance Growth.</li>
              <li className="flex items-center gap-3"><CheckIcon /> Get Hired Faster.</li>
            </ul>

            <p className="text-lg text-slate-600 mb-10">
              Everything you need to prepare for your next career opportunity, powered by advanced AI and real-time analytics.
            </p>
            
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="rounded-md bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-teal-500 transition-all"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-white border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Right Column: Vertical Workflow Timeline */}
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-teal-100 border-dashed border-l-2 border-teal-200 z-0"></div>
            
            <div className="space-y-6 relative z-10">
              <TimelineCard 
                icon="upload"
                title="Upload Resume & JD"
                desc="Provide your background and the job description for tailored context."
              />
              <TimelineCard 
                icon="questions"
                title="Generate Questions"
                desc="AI analyzes skill gaps and creates specific technical & HR questions."
              />
              <TimelineCard 
                icon="video"
                title="Live Video Interview"
                desc="Interact via webcam and microphone with our adaptive AI interviewer."
              />
              <TimelineCard 
                icon="analytics"
                title="Deep Analytics Feedback"
                desc="Get graded on vocal tone, facial expressions, and technical accuracy."
              />
            </div>
          </div>
        </div>
      </main>

      {/* 3. HORIZONTAL FEATURE STRIP */}
      <section className="bg-white border-y border-slate-200 py-10 mt-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center divide-x divide-slate-100">
            <FeatureBadge icon="code" title="Technical Interviews" />
            <FeatureBadge icon="users" title="HR Interviews" />
            <FeatureBadge icon="briefcase" title="JD Specific" />
            <FeatureBadge icon="resume" title="Resume Analysis" />
            <FeatureBadge icon="feedback" title="AI Feedback" />
            <FeatureBadge icon="chart" title="Detailed Analytics" />
          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="bg-slate-50 py-10 mt-auto">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} AI Interview Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- MICRO COMPONENTS ---

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

type IconName = "upload" | "questions" | "video" | "analytics" | "code" | "users" | "briefcase" | "resume" | "feedback" | "chart";

function AppIcon({ name, className = "h-6 w-6" }: { name: IconName, className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    upload: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 9l5-5 5 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
      </>
    ),
    questions: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14v11H9l-4 4V5z" />
      </>
    ),
    video: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h11v10H4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l5-3v10l-5-3" />
      </>
    ),
    analytics: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5M5 19h14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 16v-5M13 16V8M17 16v-8" />
      </>
    ),
    code: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l-4 4 4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l4 4-4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l-4 14" />
      </>
    ),
    users: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 11a3 3 0 100-6 3 3 0 000 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19a5.5 5.5 0 0111 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 14.5A4.5 4.5 0 0120.5 19" />
      </>
    ),
    briefcase: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5h6v2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v11H4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
      </>
    ),
    resume: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v17H7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v5h5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 13h7M10 17h5" />
      </>
    ),
    feedback: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14v10H8l-3 3V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10l2 2 4-4" />
      </>
    ),
    chart: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V5M5 19h14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 15l3-4 3 2 4-7" />
      </>
    ),
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function TimelineCard({ icon, title, desc }: { icon: IconName, title: string, desc: string }) {
  return (
    <div className="flex gap-4 items-start bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
        <AppIcon name={icon} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, title }: { icon: IconName, title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
        <AppIcon name={icon} className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold text-slate-800">{title}</span>
    </div>
  );
}
