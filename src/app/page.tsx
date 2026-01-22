"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Users, Sparkles, ChevronDown, Send, Loader2, RefreshCw, UserCircle, Mic, BookOpen, Glasses, Image as ImageIcon, MonitorPlay, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TEACHERS, TeacherProfile } from "./data";

// --- 1. TYPES & INTERFACES ---
interface SpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
}
interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface LessonGroup {
  name: string;
  task: string;
  students: string;
}

interface LessonPlan {
  title: string;
  subtitle: string;
  strategy: string;
  hook: string;
  groups: LessonGroup[];
  script: string;
  visual_type: "simulation" | "image";
  visual_prompt: string;
  visual_url?: string; // Critical for the safety net images
  isVR?: boolean;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const CLASSES = ["Class 6A", "Class 6B", "Class 7A", "Class 7B"];
const SUBJECTS = ["Math", "Physics", "Biology"];

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [query, setQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 6A");
  const [selectedSubject, setSelectedSubject] = useState("Math");
  
  const [currentTeacher, setCurrentTeacher] = useState<TeacherProfile>(TEACHERS["Sunita"]);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showClassMenu, setShowClassMenu] = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);

  const [result, setResult] = useState<LessonPlan | null>(null);
  const [simulationCode, setSimulationCode] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingSim, setLoadingSim] = useState(false);

  const [showVR, setShowVR] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // --- 2. VOICE HANDLER (Fixed for Network Errors) ---
  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN'; 
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const len = event.results.length;
        const transcript = event.results[len - 1][0].transcript;
        setQuery(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech Error:", event.error);
        // Ignore network errors to prevent crashing the UI
        if (event.error !== 'network' && event.error !== 'no-speech') {
            setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // --- 3. API HANDLERS ---
  const handleSearch = async (overrideQuery?: string) => {
    const finalQuery = overrideQuery || query;
    if (!finalQuery) return;
    
    setLoadingPlan(true);
    setLoadingSim(false);
    setResult(null);
    setSimulationCode(null);
    setMessages([]);
    setShowVR(false); 

    try {
      const planRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "plan", 
          query: finalQuery, 
          className: selectedClass, 
          subject: selectedSubject,
          teacherId: currentTeacher.id 
        }),
      });
      const planData = await planRes.json();
      if (planData.error) throw new Error(planData.error);
      
      setResult(planData);
      setLoadingPlan(false);

      // Only fetch simulation code if it is NOT VR and NOT an Image
      if (!planData.isVR && planData.visual_type === "simulation") {
        setLoadingSim(true);
        const simRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "simulation", simulation_prompt: planData.visual_prompt }),
        });
        const simData = await simRes.json();
        setSimulationCode(simData.code);
        setLoadingSim(false);
      }

    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
      setLoadingPlan(false);
      setLoadingSim(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg = chatInput;
    setChatInput(""); 
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", currentPlan: result, userQuestion: userMsg }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Connection error." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleReloadSim = async () => {
    if (!result?.visual_prompt) return;
    setLoadingSim(true);
    setSimulationCode(null); 
    try {
      const simRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulation", simulation_prompt: result.visual_prompt }),
      });
      const simData = await simRes.json();
      setSimulationCode(simData.code);
    } catch {
      console.error("Reload Error");
    } finally {
      setLoadingSim(false);
    }
  };

  // --- 4. STYLES ---
  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: `
        radial-gradient(circle at 0% 0%, rgba(253, 224, 71, 0.4) 0%, transparent 50%), 
        radial-gradient(circle at 100% 0%, rgba(244, 114, 182, 0.3) 0%, transparent 50%), 
        radial-gradient(circle at 100% 100%, rgba(147, 197, 253, 0.4) 0%, transparent 50%),
        #fffcf5
      `,
      color: "#111",
      position: "relative" as const,
      overflow: "hidden",
    },
    dropdownMenu: {
      position: "absolute" as const,
      top: "120%",
      left: 0,
      background: "rgba(255, 255, 255, 0.95)",
      border: "1px solid rgba(0,0,0,0.05)",
      borderRadius: "16px",
      padding: "8px",
      minWidth: "160px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      zIndex: 50,
      display: "flex",
      flexDirection: "column" as const,
      gap: "4px",
    },
    mediaCard: {
      background: "#0f172a", 
      borderRadius: "24px",
      overflow: "hidden",
      marginBottom: "40px",
      boxShadow: "0 30px 60px -12px rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.1)",
      height: "500px", 
      display: "flex",
      flexDirection: "column" as const,
      position: "relative" as const,
    },
    card: {
      background: "white",
      padding: "32px",
      borderRadius: "24px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      marginBottom: "24px"
    }
  };

  // --- 5. RENDER ---
  return (
    <main style={styles.container}>
      
      {/* HEADER */}
      <div style={{ position: "absolute", top: "24px", width: "100%", maxWidth: "1400px", display: "flex", justifyContent: "space-between", padding: "0 40px", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles size={20} fill="black" />
          <span style={{ fontWeight: "700", fontSize: "18px" }}>PrayogshalaXR</span>
        </div>
        
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowTeacherMenu(!showTeacherMenu)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.6)", borderRadius: "30px", fontSize: "13px", fontWeight: "600", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <UserCircle size={16} /> {currentTeacher.name} <ChevronDown size={14} style={{ opacity: 0.5 }} />
          </button>
          
          {showTeacherMenu && (
            <div style={{ ...styles.dropdownMenu, right: 0, left: "auto" }}>
              {Object.values(TEACHERS).map((teacher) => (
                <div key={teacher.id} onClick={() => { setCurrentTeacher(teacher); setShowTeacherMenu(false); }} style={{ padding: "10px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }} className="hover:bg-gray-100">
                  <span style={{ fontWeight: "600" }}>{teacher.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VR OVERLAY */}
      {showVR && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "black", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button onClick={() => setShowVR(false)} style={{position:"absolute", top: 30, right: 30, color: "white", background: "rgba(255,255,255,0.2)", padding: "10px 20px", borderRadius: "30px", border: "none", cursor: "pointer", zIndex: 310}}>Exit VR</button>
          <video autoPlay loop controls style={{ width: "100%", height: "100%", objectFit: "cover" }}><source src="/heart-vr.mp4" type="video/mp4" /></video>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!result && !loadingPlan ? (
          /* SEARCH MODE */
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ width: "100%", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "40px", zIndex: 5 }}
          >
            <h1 style={{ fontSize: "64px", fontWeight: "600", textAlign: "center", letterSpacing: "-0.03em" }}>Teach with <span style={{ fontFamily: "serif", fontStyle: "italic", color: "#666" }}>context.</span></h1>

            <div style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(24px)", borderRadius: "32px", border: "1px solid rgba(255, 255, 255, 0.6)", padding: "10px", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ position: "relative" }}>
                   <button onClick={() => setShowClassMenu(!showClassMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "8px 16px", borderRadius: "20px", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}><Users size={14} color="#3b82f6" /> {selectedClass} <ChevronDown size={12} style={{ opacity: 0.4 }} /></button>
                   {showClassMenu && <div style={styles.dropdownMenu}>{CLASSES.map(c => <div key={c} onClick={() => {setSelectedClass(c); setShowClassMenu(false)}} style={{padding:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer"}}>{c}</div>)}</div>}
                </div>
                <div style={{ position: "relative" }}>
                   <button onClick={() => setShowSubjectMenu(!showSubjectMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", padding: "8px 16px", borderRadius: "20px", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}><BookOpen size={14} color="#f97316" /> {selectedSubject} <ChevronDown size={12} style={{ opacity: 0.4 }} /></button>
                   {showSubjectMenu && <div style={styles.dropdownMenu}>{SUBJECTS.map(s => <div key={s} onClick={() => {setSelectedSubject(s); setShowSubjectMenu(false)}} style={{padding:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer"}}>{s}</div>)}</div>}
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Hi ${currentTeacher.name.split(" ")[0]}, what are we teaching today?`} style={{ width: "100%", background: "transparent", border: "none", padding: "24px", fontSize: "22px", outline: "none", resize: "none", height: "160px", color: "#222" }} />
                <button onClick={toggleListening} style={{ position: "absolute", bottom: "16px", right: "70px", width: "48px", height: "48px", background: isListening ? "#ef4444" : "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", color: isListening ? "white" : "#444" }}><Mic size={20} /></button>
                <button onClick={() => handleSearch()} style={{ position: "absolute", bottom: "16px", right: "16px", width: "48px", height: "48px", background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", color: "white" }}><ArrowUp size={20} /></button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* RESULT MODE */
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.95)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div style={{ width: "100%", maxWidth: "900px", overflowY: "auto", height: "100%", padding: "40px 20px 160px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                <button onClick={() => { setResult(null); setLoadingPlan(false); }} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", color: "#666", background: "none", border: "none", cursor: "pointer" }}><X size={18} /> Close & Back</button>
              </div>

              {loadingPlan ? (
                 <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh"}}><Loader2 className="animate-spin" size={32} style={{marginBottom:"20px"}}/><h2 style={{fontSize:"20px", fontWeight:"600"}}>Mentoring {currentTeacher.name}...</h2></div>
              ) : (
                <>
                  <h1 style={{ fontSize: "48px", fontWeight: "800", marginBottom: "16px", letterSpacing: "-1px", lineHeight: "1.1" }}>{result?.title}</h1>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "48px" }}>
                    <span style={{ background: "#f3f4f6", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", color: "#444" }}>{result?.subtitle}</span>
                    <span style={{ background: "#dbeafe", color: "#1e40af", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600" }}>AI Mentor</span>
                  </div>

                  {/* VISUAL MODULE */}
                  <div style={styles.mediaCard}>
                    
                    {/* 1. VR MODE */}
                    {result?.isVR ? (
                       <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background: "linear-gradient(135deg, #000 0%, #222 100%)", color:"white", cursor:"pointer"}} onClick={() => setShowVR(true)}>
                          <Glasses size={64} style={{marginBottom:"20px"}} />
                          <h2 style={{fontSize:"24px", fontWeight:"bold"}}>Virtual Reality Lab</h2>
                          <p style={{opacity:0.7, marginBottom:"20px"}}>Click to Enter</p>
                          <button style={{background:"white", color:"black", padding:"10px 20px", borderRadius:"30px", border:"none", fontWeight:"bold"}}>Launch</button>
                       </div>
                    ) : result?.visual_type === "image" ? (
                       // 2. IMAGE GENERATION (With Fallback)
                       <div style={{width: "100%", height: "100%", position: "relative", background: "#f0f0f0"}}>
                          <div style={{position:"absolute", top:16, left:16, zIndex:10, display:"flex", alignItems:"center", gap: "8px", background:"rgba(0,0,0,0.6)", padding:"6px 12px", borderRadius:"20px", color:"white", fontSize:"12px", fontWeight:"600"}}>
                             <ImageIcon size={14} /> High-Fidelity Diagram
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={result.visual_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(result.visual_prompt || "")}?width=800&height=500&nologo=true`} 
                            alt="Visual Aid" 
                            style={{width: "100%", height: "100%", objectFit: "contain"}} 
                          />
                       </div>
                    ) : (
                       // 3. INTERACTIVE SIMULATION
                       <>
                         <div style={{ padding: "16px 24px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", position:"absolute", top:0, left:0, width:"100%", zIndex:10 }}>
                            <div style={{display: "flex", alignItems: "center", gap: "8px"}}><MonitorPlay size={18} color="#22d3ee" /><span style={{color: "white", fontSize: "14px", fontWeight: "600"}}>INTERACTIVE LAB (H5)</span></div>
                            <button onClick={handleReloadSim} style={{background:"none", border:"none", cursor:"pointer", color:"white", opacity: 0.7}}><RefreshCw size={14} /></button>
                         </div>
                         {loadingSim ? (
                            <div style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white"}}><Loader2 className="animate-spin" size={32} /><p>Building Simulation...</p></div>
                         ) : (
                            simulationCode && <iframe srcDoc={simulationCode} style={{ width: "100%", height: "100%", border: "none", background: "#0f172a" }} title="Simulation" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups" />
                         )}
                       </>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div style={styles.card}>
                    <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#999", marginBottom: "16px", textTransform: "uppercase" }}>Strategy for {currentTeacher.name}</h3>
                    <p style={{ fontSize: "20px", lineHeight: "1.6", color: "#111", marginBottom: "24px" }}>{result?.strategy}</p>
                    <div style={{ padding: "20px", background: "#fffbeb", borderLeft: "4px solid #fbbf24", borderRadius: "8px" }}><p style={{ fontSize: "16px", fontWeight: "600", color: "#92400e" }}>💡 Desi Hook: {result?.hook}</p></div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "40px" }}>
                    {result?.groups.map((g, i) => (
                      <div key={i} style={{ background: "white", padding: "24px", borderRadius: "20px", border: "1px solid #eee" }}>
                        <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>{g.name}</div>
                        <div style={{ fontSize: "12px", color: "#666", marginBottom: "16px", fontWeight: "600" }}>{g.students}</div>
                        <div style={{ fontSize: "15px", lineHeight: "1.4", color: "#333" }}>{g.task}</div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.card}>
                    <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#999", marginBottom: "16px", textTransform: "uppercase" }}>Verbal Script</h3>
                    <p style={{ fontFamily: "monospace", fontSize: "16px", lineHeight: "1.8", color: "#333" }}>{result?.script}</p>
                  </div>

                  {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: "40px" }}>
                      {msg.role === "user" ? (
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", paddingLeft: "10px" }}><div style={{width: 24, height: 24, background: "#000", borderRadius: "50%", display: "flex", alignItems:"center", justifyContent:"center"}}><ArrowUp size={12} color="white" /></div><h3 style={{ fontSize: "20px", fontWeight: "600" }}>{msg.text}</h3></div>
                      ) : (
                        <div style={styles.card}><h3 style={{ fontSize: "12px", fontWeight: "800", color: "#3b82f6", marginBottom: "16px" }}>AI Mentor</h3><p style={{ fontSize: "18px", lineHeight: "1.7" }}>{msg.text}</p></div>
                      )}
                    </div>
                  ))}
                  
                  {/* CHAT INPUT */}
                  <div style={{ position: "fixed", bottom: "30px", width: "90%", maxWidth: "700px", zIndex: 210 }}>
                     <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "100px", padding: "8px 12px 8px 24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)", width: "100%" }}>
                        <div style={{ width: "36px", height: "36px", background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageSquare size={18} color="white" /></div>
                        <input type="text" placeholder="Dive deeper..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSend()} style={{ flex: 1, border: "none", background: "transparent", fontSize: "16px", outline: "none" }} />
                        <button onClick={handleChatSend} disabled={chatLoading || !chatInput} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={18} color="#444" /></button>
                     </div>
                  </div>
                  <div ref={bottomRef} style={{height: "100px"}} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}