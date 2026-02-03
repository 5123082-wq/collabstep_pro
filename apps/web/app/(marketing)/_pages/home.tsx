'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Code2,
  Layout,
  MessageSquare,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Cpu,
  Workflow,
  Clock
} from 'lucide-react';

// --- Styles for Custom Animations ---
const CustomStyles = () => (
  <style jsx global>{`
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes gradient-x {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes orbit {
      0% { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes beam {
      0%, 100% { opacity: 0; transform: scaleX(0); }
      50% { opacity: 1; transform: scaleX(1); }
    }
    @keyframes warp {
      0% { transform: scale(1) translateZ(0); opacity: 0; }
      50% { opacity: 0.5; }
      100% { transform: scale(4) translateZ(0); opacity: 0; }
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-fade-in {
      animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-gradient-x {
      background-size: 200% 200%;
      animation: gradient-x 6s ease infinite;
    }
    .animate-scroll {
      animation: scroll 40s linear infinite;
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    .perspective-[2000px] {
      perspective: 2000px;
    }
    .rotate-x-\\[15deg\\] {
      transform: rotateX(15deg);
    }
    .hover\\:rotate-x-0:hover {
      transform: rotateX(0deg);
    }
    /* Smooth glassmorphism */
    .glass {
      background: rgba(13, 13, 13, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: linear-gradient(180deg, rgba(23, 23, 23, 0.8) 0%, rgba(13, 13, 13, 0.9) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  `}</style>
);

// --- UI Components ---

type ButtonProps = React.ComponentPropsWithoutRef<'button'> & { variant?: string; size?: string };
const Button = ({ variant = 'primary', size = 'default', children, className = '', ...props }: ButtonProps) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-neutral-950 duration-200";
  const variants = {
    primary: "bg-white text-neutral-950 hover:bg-neutral-200 focus:ring-white shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)]",
    secondary: "bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-700 border border-neutral-700",
    outline: "border border-neutral-800 text-neutral-300 hover:bg-neutral-900 hover:text-white focus:ring-neutral-800",
    ghost: "text-neutral-400 hover:text-white hover:bg-neutral-900/50",
    accent: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-5 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10",
  };
  
  return (
    <button className={`${base} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Badge = ({ children, className = '', variant = 'neutral' }: { children?: React.ReactNode; className?: string; variant?: 'neutral' | 'blue' | 'green' }) => {
  const variants = {
    neutral: "border-neutral-800 bg-neutral-900/50 text-neutral-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </span>
  );
};

const Section = ({ children, className = '', id = '' }: { children?: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={`py-24 md:py-32 relative overflow-hidden ${className}`}>
    {children}
  </section>
);

// --- Sections ---

const HeroAnimation = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Central Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />
      
      {/* Orbital Ring 1 (Humans) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-neutral-800/20 animate-[spin_60s_linear_infinite] hidden md:block">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 w-14 h-14 bg-[#0A0A0A] border border-neutral-800 rounded-full flex items-center justify-center shadow-2xl z-10">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="User" className="w-10 h-10 rounded-full opacity-80" />
         </div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 w-14 h-14 bg-[#0A0A0A] border border-neutral-800 rounded-full flex items-center justify-center shadow-2xl z-10">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="User" className="w-10 h-10 rounded-full opacity-80" />
         </div>
         <div className="absolute top-1/2 right-0 translate-x-6 -translate-y-1/2 w-14 h-14 bg-[#0A0A0A] border border-neutral-800 rounded-full flex items-center justify-center shadow-2xl z-10">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" alt="User" className="w-10 h-10 rounded-full opacity-80" />
         </div>
      </div>

       {/* Orbital Ring 2 (AI) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-blue-500/10 animate-[spin_40s_linear_infinite_reverse] hidden md:block">
         <div className="absolute top-1/2 right-0 translate-x-5 -translate-y-1/2 w-12 h-12 bg-blue-950/30 border border-blue-500/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-sm z-10">
            <Bot className="w-6 h-6 text-blue-400" />
         </div>
         <div className="absolute top-1/2 left-0 -translate-x-5 -translate-y-1/2 w-12 h-12 bg-blue-950/30 border border-blue-500/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-sm z-10">
            <Code2 className="w-6 h-6 text-indigo-400" />
         </div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5 w-12 h-12 bg-blue-950/30 border border-blue-500/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-sm z-10">
            <Zap className="w-6 h-6 text-yellow-400" />
         </div>
      </div>
      
      {/* Connecting Beams (Visual) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]">
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
      </div>
    </div>
  );
};

const AnimatedCounter = ({ end, suffix = "", duration = 2000 }: { end: number, suffix?: string, duration?: number }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const totalFrames = 60;
          let currentFrame = 0;
          
          const timer = setInterval(() => {
            currentFrame++;
            const progress = currentFrame / totalFrames;
            const ease = 1 - Math.pow(1 - progress, 4);
            const currentCount = Math.floor(end * ease);
            
            if (currentFrame === totalFrames) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(currentCount);
            }
          }, duration / totalFrames);
          
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const StatsSection = () => {
  const stats = [
    { 
      label: "Активных пользователей", 
      value: 12500, 
      suffix: "+", 
      icon: Users,
      desc: "Включая команды из Fortune 500" 
    },
    { 
      label: "Запущено проектов", 
      value: 3400, 
      suffix: "", 
      icon: Rocket,
      desc: "От MVP до Enterprise решений" 
    },
    { 
      label: "AI-генераций", 
      value: 850000, 
      suffix: "+", 
      icon: Bot,
      desc: "Задач, кода и контента" 
    },
    { 
      label: "Сэкономлено часов", 
      value: 42000, 
      suffix: "", 
      icon: Clock,
      desc: "На рутинных операциях" 
    }
  ];

  const logos = ["Acme Corp", "GlobalTech", "Nebula", "Trio", "FoxHub", "Circle", "Aven"];

  return (
    <div className="relative border-y border-neutral-900 bg-[#0A0A0A]">
      {/* Marquee Section */}
      <div className="py-8 overflow-hidden border-b border-neutral-900 bg-neutral-950/50">
        <div className="container px-4 mx-auto mb-6 text-center">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
            Нам доверяют инновационные команды
          </p>
        </div>
        <div className="relative flex overflow-hidden group mask-linear-fade">
          <div className="animate-scroll flex gap-16 min-w-full justify-around items-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
            {[...logos, ...logos, ...logos, ...logos].map((logo, i) => (
              <div key={i} className="whitespace-nowrap font-bold text-xl text-neutral-400 flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-xs text-neutral-600">Logo</div> {logo}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="container px-4 mx-auto py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="relative group p-6 rounded-2xl border border-transparent hover:border-neutral-800 hover:bg-neutral-900/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                  <stat.icon className="w-5 h-5" />
                </div>
                {idx === 2 && (
                   <span className="flex h-2 w-2 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                   </span>
                )}
              </div>
              
              <div className="text-3xl md:text-4xl font-bold text-white mb-2 font-mono tracking-tight">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              
              <div className="text-sm font-medium text-neutral-300 mb-1">
                {stat.label}
              </div>
              
              <div className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Hero = () => {
  return (
    <Section className="pt-32 md:pt-48 pb-20 md:pb-32 !overflow-visible relative">
      <HeroAnimation />
      {/* Subtle Professional Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/20 via-neutral-950 to-neutral-950" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-800 to-transparent opacity-50" />
      </div>

      <div className="container px-4 mx-auto relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm text-xs font-medium text-neutral-400 mb-8 animate-fade-in-up hover:border-neutral-700 transition-colors cursor-default">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Collabverse v2.0 is live</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05]">
          Команда людей <br />
          <span className="text-neutral-500 flex items-center justify-center gap-4 flex-wrap">
            <span>+</span> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 animate-gradient-x pb-2">
              AI Сотрудники
            </span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Не просто &quot;инструмент с AI&quot;. В Collabverse вы нанимаете автономных AI-агентов, которые работают в тандеме с вашей командой: проводят ресерч, пишут код и ведут проекты.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" variant="primary" className="group min-w-[200px]">
            Начать работу
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1 text-neutral-400 group-hover:text-neutral-950" />
          </Button>
          <Button variant="outline" size="lg" className="min-w-[200px] bg-transparent">
            <Play className="w-4 h-4 mr-2" />
            Как это работает?
          </Button>
        </div>

        {/* Professional UI Preview */}
        <div className="mt-24 relative mx-auto max-w-6xl">
          {/* Main Interface Window */}
          <div className="relative bg-[#0A0A0A] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl shadow-blue-900/5">
            {/* Window Controls */}
            <div className="h-10 border-b border-neutral-800 flex items-center px-4 justify-between bg-neutral-900/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                <ShieldCheck className="w-3 h-3" /> collabverse.secure
              </div>
            </div>

            <div className="grid grid-cols-[260px_1fr_320px] h-[600px] bg-[#0A0A0A]">
              {/* Sidebar Navigation */}
              <div className="border-r border-neutral-800 p-4 flex flex-col gap-6 bg-neutral-900/10">
                <div className="flex items-center gap-2 px-2 text-white font-semibold">
                  <div className="w-6 h-6 bg-white rounded-md" /> Collabverse
                </div>
                
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-neutral-500 px-2 mb-2 uppercase tracking-wider">Workspace</div>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800/50 text-white text-sm rounded-md border border-neutral-800">
                    <Rocket className="w-4 h-4 text-blue-400" /> Launch MVP
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-neutral-400 text-sm hover:text-white transition-colors cursor-pointer">
                    <Briefcase className="w-4 h-4" /> Clients Q1
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-neutral-500 px-2 mb-2 uppercase tracking-wider">Team (3 Online)</div>
                   <div className="flex items-center gap-2 px-2 py-1 text-sm text-neutral-300">
                    <div className="w-2 h-2 rounded-full bg-green-500" /> Alex (Lead)
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-neutral-300">
                    <div className="w-2 h-2 rounded-full bg-green-500" /> Sarah (Design)
                  </div>
                   <div className="flex items-center gap-2 px-2 py-1 text-sm text-blue-300 bg-blue-500/5 rounded border border-blue-500/10">
                    <Sparkles className="w-3 h-3 text-blue-400" /> AI Analyst <span className="text-[10px] ml-auto opacity-70">BOT</span>
                  </div>
                </div>
              </div>
              
              {/* Main Canvas (Task View) */}
              <div className="p-8 overflow-hidden relative">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                       <span>Projects</span> <ChevronRight className="w-3 h-3" /> <span>Launch MVP</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Market Research & Analysis</h2>
                  </div>
                  <Button size="sm" variant="accent">Complete Sprint</Button>
                </div>

                {/* Task Description */}
                <div className="space-y-6 max-w-2xl">
                   <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/20">
                     <p className="text-sm text-neutral-300 leading-relaxed">
                       Нужно провести анализ конкурентов в сегменте No-code платформ. Собрать данные по ценам, фичам и маркетинговым стратегиям.
                     </p>
                   </div>

                   {/* Subtasks with AI assignment */}
                   <div className="space-y-3">
                     <div className="text-sm font-medium text-white flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-blue-500" /> Subtasks
                     </div>
                     
                     <div className="flex items-center justify-between p-3 rounded border border-neutral-800 bg-neutral-900/30 group hover:border-neutral-700 transition-colors">
                       <div className="flex items-center gap-3">
                         <div className="w-4 h-4 rounded border border-neutral-600" />
                         <span className="text-sm text-neutral-300">Сбор данных по Top-10 конкурентам</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Badge variant="blue">In Progress</Badge>
                         <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center border border-neutral-900 shadow-sm" title="Assigned to AI Analyst">
                            <Bot className="w-3 h-3 text-white" />
                         </div>
                       </div>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded border border-neutral-800 bg-neutral-900/30">
                       <div className="flex items-center gap-3">
                         <div className="w-4 h-4 rounded border border-neutral-600" />
                         <span className="text-sm text-neutral-300">Подготовка сводной презентации</span>
                       </div>
                        <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">
                           S
                         </div>
                     </div>
                   </div>
                </div>
              </div>

              {/* Chat Panel (AI Collaboration) */}
              <div className="border-l border-neutral-800 bg-neutral-900/20 flex flex-col">
                 <div className="p-4 border-b border-neutral-800 text-xs font-medium text-neutral-400 uppercase tracking-wide">
                   Project Chat
                 </div>
                 <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                    {/* User Message */}
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-neutral-700 flex-shrink-0" />
                       <div className="space-y-1">
                          <div className="text-xs text-neutral-400 flex items-center gap-2">
                            Alex <span className="text-[10px] opacity-50">10:23 AM</span>
                          </div>
                          <div className="bg-neutral-800 text-neutral-200 text-sm p-3 rounded-2xl rounded-tl-none">
                            @AI Analyst, собери мне краткую сводку по ценам Webflow и Bubble.
                          </div>
                       </div>
                    </div>

                    {/* AI Message */}
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/20">
                         <Bot className="w-4 h-4 text-white" />
                       </div>
                       <div className="space-y-1">
                          <div className="text-xs text-blue-400 flex items-center gap-2 font-medium">
                            AI Analyst <span className="text-[10px] text-neutral-500 font-normal">10:24 AM</span>
                          </div>
                          <div className="bg-blue-900/20 border border-blue-500/20 text-neutral-200 text-sm p-3 rounded-2xl rounded-tl-none space-y-2">
                            <p>Конечно. Вот сравнение базовых тарифов:</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-neutral-300">
                              <li><b>Webflow:</b> от $14/мес (CMS: $23)</li>
                              <li><b>Bubble:</b> от $29/мес (Starter)</li>
                            </ul>
                            <div className="pt-2 border-t border-blue-500/20 flex gap-2">
                               <button className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded hover:bg-blue-500/30 transition-colors">Сформировать отчет</button>
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                    <div className="h-9 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center px-3 text-sm text-neutral-500">
                      Message...
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

// New Section: Collaboration Visualized
const CollaborationSection = () => (
  <Section className="bg-neutral-950" id="collaboration">
    <div className="container px-4 mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
      <div>
        <Badge variant="blue" className="mb-6">Workflow 2.0</Badge>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Не делегируйте задачи. <br />
          <span className="text-neutral-500">Делите их с AI.</span>
        </h2>
        <p className="text-lg text-neutral-400 mb-8 leading-relaxed">
          В традиционных таск-трекерах задачи просто &quot;висят&quot;. В Collabverse вы назначаете их AI-агентам, как обычным сотрудникам.
        </p>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
               <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Автономное выполнение</h4>
              <p className="text-sm text-neutral-400">Агенты сами запрашивают доступы, ищут информацию и прикрепляют результаты к задаче.</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
               <Workflow className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Бесшовная передача</h4>
              <p className="text-sm text-neutral-400">Начните черновик, тегните агента для доработки, и получите готовый документ утром.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
         {/* Visual representation of Hybrid Team */}
         <div className="glass-card rounded-2xl p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-semibold text-white">Project Team</h3>
              <div className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">Active Sprint</div>
            </div>

            <div className="space-y-4">
              {/* Human */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-neutral-800">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-400">YO</div>
                   <div>
                     <div className="text-white text-sm font-medium">You (Product Owner)</div>
                     <div className="text-neutral-500 text-xs">Strategy & Review</div>
                   </div>
                </div>
              </div>

              {/* Connecting Line */}
              <div className="h-8 w-[1px] bg-gradient-to-b from-neutral-800 to-blue-500/50 mx-auto" />

              {/* AI Agent */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-900/10 border border-blue-500/30 shadow-[0_0_15px_-5px_rgba(37,99,235,0.2)]">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <div className="text-white text-sm font-medium">Dev Agent 01</div>
                     <div className="text-blue-400 text-xs flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Generating API tests...
                     </div>
                   </div>
                </div>
                <div className="text-xs text-neutral-400 font-mono">84%</div>
              </div>

               {/* Connecting Line */}
              <div className="h-8 w-[1px] bg-gradient-to-b from-blue-500/50 to-neutral-800 mx-auto" />

               {/* Human */}
               <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-neutral-800">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                     <div className="w-full h-full rounded-full overflow-hidden bg-neutral-700" />
                   </div>
                   <div>
                     <div className="text-white text-sm font-medium">Senior Dev</div>
                     <div className="text-neutral-500 text-xs">Reviewing Code</div>
                   </div>
                </div>
              </div>
            </div>
         </div>
         
         {/* Background Elements */}
         <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
      </div>
    </div>
  </Section>
);

const BentoGrid = () => (
  <Section className="bg-neutral-950/50" id="features">
    <div className="container px-4 mx-auto">
      <div className="mb-16 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Экосистема полного цикла</h2>
        <p className="text-neutral-400 text-lg">
          Все необходимое для запуска продукта: от генерации идей с AI до найма экспертов в маркетплейсе.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[340px]">
        {/* Large Item: AI Core */}
        <div className="md:col-span-2 row-span-1 md:row-span-1 rounded-3xl p-8 bg-[#0D0D0D] border border-neutral-800 relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-neutral-800/20 to-transparent blur-3xl" />
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="mb-auto">
              <Badge className="mb-4" variant="blue">AI Core</Badge>
              <h3 className="text-2xl font-bold text-white mb-2">Интеллектуальный Хаб</h3>
              <p className="text-neutral-400 max-w-md">
                Доступ к лучшим моделям (GPT-4, Claude 3) прямо в контексте ваших задач. Генерация контента, кода и аналитики без переключения вкладок.
              </p>
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-3">
               {[
                 { icon: MessageSquare, label: "Context Chat", color: "text-blue-400" },
                 { icon: Layout, label: "UI Generation", color: "text-indigo-400" },
                 { icon: Zap, label: "Auto-Tasks", color: "text-yellow-400" }
               ].map((item, i) => (
                 <div key={i} className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 hover:bg-neutral-900 transition-colors">
                    <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
                    <div className="text-sm text-neutral-200 font-medium">{item.label}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Medium Item: Marketplace */}
        <div className="rounded-3xl p-8 bg-[#0D0D0D] border border-neutral-800 relative overflow-hidden hover:border-neutral-700 transition-colors group">
          <Badge className="mb-4">Talent</Badge>
          <h3 className="text-xl font-bold text-white mb-2">Маркетплейс</h3>
          <p className="text-sm text-neutral-400 mb-6">Нанимайте проверенных экспертов для сложных задач.</p>
          
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-neutral-800" />
                   <div>
                     <div className="h-3 w-20 bg-neutral-800 rounded mb-1" />
                     <div className="h-2 w-12 bg-neutral-800/50 rounded" />
                   </div>
                </div>
                <div className="px-2 py-1 bg-neutral-800 rounded text-[10px] text-neutral-500">Hire</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Section>
);

type RoleKey = 'founder' | 'freelancer' | 'agency';
type RoleContent = {
  title: string;
  desc: string;
  features: string[];
  imageIcon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
};
const RoleSwitcher = () => {
  const [activeTab, setActiveTab] = useState<RoleKey>('founder');

  const content: Record<RoleKey, RoleContent> = {
    founder: {
      title: "Для Основателей",
      desc: "Запускайте проекты быстрее. От идеи до MVP за недели, а не месяцы. Используйте AI для валидации гипотез.",
      features: ["Контроль бюджета (Burn rate)", "AI-аналитика прогресса", "Быстрый найм команды"],
      imageIcon: Rocket
    },
    freelancer: {
      title: "Для Экспертов",
      desc: "Фокусируйтесь на сложных задачах, пока AI берет на себя рутину. Безопасные сделки и удобное портфолио.",
      features: ["Гарантия выплат", "Авто-отчеты для клиентов", "AI-помощник в коде"],
      imageIcon: Code2
    },
    agency: {
      title: "Для Агентств",
      desc: "Масштабируйте производство без раздувания штата. Управляйте десятками проектов в едином окне.",
      features: ["Мульти-аккаунты", "Whitelabel отчетность", "Единый пул ресурсов"],
      imageIcon: Briefcase
    }
  };

  return (
    <Section className="bg-neutral-950">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Платформа, которая <br />
              <span className="text-neutral-500">понимает вашу роль</span>
            </h2>
            
            <div className="space-y-2">
              {(Object.keys(content) as RoleKey[]).map((key) => (
                <div 
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`p-6 rounded-xl border transition-all cursor-pointer duration-300 ${
                    activeTab === key 
                      ? 'bg-neutral-900 border-neutral-700' 
                      : 'bg-transparent border-transparent hover:bg-neutral-900/30'
                  }`}
                >
                  <h3 className={`text-lg font-medium mb-1 ${activeTab === key ? 'text-white' : 'text-neutral-400'}`}>
                    {content[key].title}
                  </h3>
                  {activeTab === key && (
                    <div className="overflow-hidden animate-fade-in">
                        <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                          {content[key].desc}
                        </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 relative h-[450px]">
             {/* Dynamic Content Card */}
             {(Object.keys(content) as RoleKey[]).map((key) => {
               const Icon = content[key].imageIcon;
               return (
                <div 
                  key={key}
                  className={`absolute inset-0 bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-8 flex flex-col transition-all duration-500 ${
                    activeTab === key ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-8 z-0'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-8">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-6">{content[key].title}</h3>
                  
                  <ul className="space-y-4 mb-auto">
                    {content[key].features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-3 text-neutral-300">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="outline" className="w-full mt-8 border-neutral-800 hover:bg-neutral-900">
                    Начать как {content[key].title.split(' ')[1]}
                  </Button>
                </div>
               );
             })}
          </div>
        </div>
      </div>
    </Section>
  );
};

const FinalCTA = () => (
  <Section className="relative border-t border-neutral-900 overflow-hidden min-h-[600px] flex items-center justify-center bg-black">
    {/* Warp Speed Effect Background */}
    <div className="absolute inset-0 z-0 overflow-hidden">
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/0 via-black to-black z-10" />
       {/* Stars / Lines Animation */}
       <div className="absolute top-1/2 left-1/2 w-[100vw] h-[100vh] -translate-x-1/2 -translate-y-1/2 opacity-20">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute top-1/2 left-1/2 w-[2px] h-[50vh] bg-gradient-to-b from-transparent via-blue-500 to-transparent origin-bottom"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-100%)`,
                animation: `pulse-subtle 3s infinite ease-in-out ${i * 0.2}s`
              }}
            />
          ))}
       </div>
    </div>

    <div className="container px-4 mx-auto relative z-10 text-center">
      <div className="inline-flex items-center justify-center p-2 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-md mb-8 ring-1 ring-white/10">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        <span className="text-xs text-neutral-300 font-mono tracking-widest">SYSTEM READY</span>
      </div>

      <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter leading-tight">
        Активируйте пространство <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500">
           для вашей команды
        </span>
      </h2>
      
      <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-12 font-light">
        14 дней бесплатно. Без карты. <br/>Полный доступ к AI-агентам и маркетплейсу.
      </p>
      
      <div className="relative group inline-block">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
        <Button size="lg" className="relative h-16 px-12 rounded-full bg-white text-black text-lg font-bold hover:bg-neutral-100 shadow-2xl shadow-blue-500/20 transition-all active:scale-95">
           Запустить Collabverse
           <Rocket className="w-5 h-5 ml-2 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform text-blue-600" />
        </Button>
      </div>

      <div className="mt-12 flex justify-center gap-8 text-neutral-600 text-xs font-mono uppercase tracking-widest">
        <div>Secure 256-bit SSL</div>
        <div>GDPR Compliant</div>
        <div>24/7 Support</div>
      </div>
    </div>
  </Section>
);

export default function MarketingHome() {
  return (
    <div className="bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <CustomStyles />
      <Hero />
      <StatsSection />
      <CollaborationSection />
      <BentoGrid />
      <RoleSwitcher />
      <FinalCTA />
    </div>
  );
}
