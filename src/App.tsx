import React, { useEffect, useState, FormEvent } from "react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { BrainCircuit, LogOut, Plus, Trash2, Video, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import toast, { Toaster } from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ensure error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Memory = {
  id: string;
  userId: string;
  content: string;
  category: string;
  status: "generating" | "completed" | "error";
  operationName?: string;
  createdAt: any;
  updatedAt: any;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemories([]);
      return;
    }

    const q = query(collection(db, "users", user.uid, "memories"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Memory[];
      
      // Sort by creation time (descending)
      mems.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      
      setMemories(mems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/memories`);
    });

    return () => unsubscribe();
  }, [user]);

  // Polling effect for 'generating' memories
  useEffect(() => {
    if (!user) return;
    
    const generatingMems = memories.filter(m => m.status === 'generating' && m.operationName);
    if (generatingMems.length === 0) return;

    const interval = setInterval(() => {
      generatingMems.forEach(async (mem) => {
        try {
          const res = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: mem.operationName })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.done) {
              const memRef = doc(db, "users", user.uid, "memories", mem.id);
              const newStatus = data.isError ? 'error' : 'completed';
              await updateDoc(memRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
              }).catch(err => handleFirestoreError(err, OperationType.UPDATE, memRef.path));
            }
          }
        } catch (err) {
          console.error("Polling error for", mem.id, err);
        }
      });
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [memories, user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !user || isSubmitting) return;

    const contentToProcess = inputContent.trim();
    setInputContent("");
    setIsSubmitting(true);
    
    let toastId = toast.loading('Synthesizing memory...', {
      style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' }
    });

    try {
      // 1. Classify
      const classRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToProcess })
      });
      
      if (!classRes.ok) throw new Error("Failed to classify information.");
      const { category } = await classRes.json();

      // 2. Start Video Generation
      const vidRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToProcess })
      });
      
      if (!vidRes.ok) throw new Error("Failed to start visual generation.");
      const { operationName } = await vidRes.json();

      // 3. Save to Firestore
      const newId = generateId();
      const memRef = doc(db, "users", user.uid, "memories", newId);
      await setDoc(memRef, {
        userId: user.uid,
        content: contentToProcess,
        category,
        status: "generating",
        operationName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, memRef.path));
      
      toast.success('Memory forged and anchored!', { id: toastId, style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' } });

    } catch (err: any) {
      console.error("Submit pipeline failed:", err);
      toast.error(err.message || 'Failed to forge memory. Please try again.', { id: toastId, style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' } });
      setInputContent(contentToProcess); // Restore text so user doesn't lose it
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const deleteMemory = async (id: string) => {
    if (!user) return;
    
    const toastId = toast.loading('Deleting memory anchor...', {
      style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' }
    });
    
    try {
      const memRef = doc(db, "users", user.uid, "memories", id);
      await deleteDoc(memRef).catch(err => handleFirestoreError(err, OperationType.DELETE, memRef.path));
      toast.success('Anchor destroyed.', { id: toastId, style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' } });
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || 'Failed to delete anchor.', { id: toastId, style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' } });
    }
  };

  if (!authReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D0D0D]">
        <Loader2 className="animate-spin w-8 h-8 text-zinc-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full bg-[#0D0D0D] text-[#E0E0E0] font-sans flex flex-row overflow-hidden items-center justify-center">
        <div className="w-full max-w-md border border-[#333] flex flex-col p-12 bg-[#121212] text-center shadow-2xl">
          <div className="mb-12">
            <h1 className="text-5xl font-serif italic font-light tracking-tighter text-white">Mnemo<br/>Palace</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#666] mt-4">Your Random Thought Collector</p>
          </div>
          <button
            onClick={login}
            className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Group memories by category
  const groupedMemories = memories.reduce((acc, mem) => {
    if (!acc[mem.category]) acc[mem.category] = [];
    acc[mem.category].push(mem);
    return acc;
  }, {} as Record<string, Memory[]>);

  const categoryColors = [
    { border: 'border-indigo-500', text: 'text-indigo-400' },
    { border: 'border-amber-500', text: 'text-amber-400' },
    { border: 'border-emerald-500', text: 'text-emerald-400' },
    { border: 'border-rose-500', text: 'text-rose-400' },
    { border: 'border-cyan-500', text: 'text-cyan-400' }
  ];
  
  const getCategoryColor = (index: number) => categoryColors[index % categoryColors.length];

  return (
    <div className='w-full min-h-screen bg-[#0D0D0D] text-[#E0E0E0] font-sans flex flex-col md:flex-row'> 
      <Toaster position="bottom-right" />
      
      {/* Sidebar */}
      <div className='w-full md:w-[380px] md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-[#333] flex flex-col p-6 md:p-8 bg-[#121212] flex-shrink-0 z-30'> 
        <div className='mb-6 md:mb-12 shrink-0'> 
          <h1 className='text-3xl md:text-5xl font-serif italic font-light tracking-tighter text-white'>Mnemo<br className="hidden md:block"/>Palace</h1> 
          <p className='text-[10px] uppercase tracking-[0.3em] text-[#666] mt-2'>Your Random Thought Collector</p> 
        </div> 
        
        <div className='flex-1 flex flex-col gap-6 overflow-y-auto pr-2 min-h-[300px]'> 
          <form onSubmit={handleSubmit} className='space-y-2 shrink-0'> 
            <label className='text-[10px] uppercase font-bold text-[#999] tracking-widest flex justify-between items-center'>
              Raw Input Feed
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin text-white" />}
            </label> 
            <textarea 
              name="content"
              id="content"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              disabled={isSubmitting}
              className='w-full h-24 md:h-32 bg-[#1A1A1A] border border-[#333] p-4 text-base focus:outline-none focus:border-white resize-none text-white' 
              placeholder='Type anything... "Meeting at 4pm", "Bananas are berries"'
            />
            <button 
              type="submit"
              disabled={!inputContent.trim() || isSubmitting}
              className='w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? 'Forging...' : 'Forge Memory'}
            </button> 
          </form> 
          
          <div className='mt-4 md:mt-8 space-y-4'> 
            <label className='text-[10px] uppercase font-bold text-[#999] tracking-widest'>Spatial Sorting</label> 
            <div className='flex flex-col gap-2'> 
              {Object.keys(groupedMemories).length === 0 ? (
                <div className="text-[10px] text-[#666] italic py-4">No sorting anchors yet.</div>
              ) : (
                (Object.entries(groupedMemories) as [string, Memory[]][]).map(([catName, m], i) => {
                  const colors = getCategoryColor(i);
                  const latest = m[0]; // memories are sorted desc by date
                  const timeLabel = latest.createdAt?.toDate ? 
                    latest.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
                  
                  return (
                    <div key={catName} className={`group flex items-center justify-between p-3 border-l-2 ${colors.border} bg-[#1A1A1A] hover:bg-[#222] transition-colors cursor-default`}> 
                      <div> 
                        <p className='text-xs font-bold truncate max-w-[200px] text-white'>{catName}</p> 
                        <p className='text-[10px] text-[#666]'>Sorted {timeLabel}</p> 
                      </div> 
                      <span className={`text-[10px] ${colors.text}`}>[{String(m.length).padStart(2, '0')}]</span> 
                    </div>
                  );
                })
              )}
            </div> 
          </div> 
        </div> 
        
        <div className='mt-auto pt-8 border-t border-[#333] flex justify-between items-center'> 
          <span className="text-[9px] text-[#444]">SYSTEM VERSION 2.0.4 / HYPER-LINKS ACTIVE</span>
          <button onClick={logout} className="text-[#666] hover:text-white transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div> 
      </div> 
      
      {/* Main Area */}
      <div className='flex-1 min-h-screen bg-[#0D0D0D] flex flex-col relative'> 
        <div className='absolute top-8 right-8 z-20 hidden md:flex gap-4'> 
          <div className='flex flex-col items-end'> 
            <span className='text-[10px] font-bold text-white uppercase'>Anchor Active</span> 
            <span className='text-[10px] text-[#666] uppercase'>{user.displayName || user.email?.split('@')[0]}</span> 
          </div> 
          <div className='w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold uppercase shadow-lg'>
            {user.displayName?.[0] || user.email?.[0] || '?'}
          </div> 
        </div> 
        
        <div className='flex-1 p-6 md:p-16 flex flex-col items-center gap-16 md:gap-24 pb-32 pt-16 md:pt-16'> 
          {memories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-3xl font-serif italic text-[#333]">Awaiting initial input...</h2>
            </div>
          ) : (
            memories.map((mem) => (
              <div key={mem.id} className='w-full max-w-lg'>
                <div className='relative w-full aspect-[4/5] bg-gradient-to-br from-indigo-900/40 via-[#121212] to-amber-900/40 rounded-[60px] overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group'> 
                  <div className='absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none' style={{ backgroundImage: 'radial-gradient(circle at center, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div> 
                  
                  <button 
                    onClick={() => deleteMemory(mem.id)}
                    className="absolute top-6 right-6 z-30 w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white/10"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {mem.status === 'generating' ? (
                    <div className='relative z-10 text-center px-12 flex flex-col items-center'>
                      <div className='w-32 h-32 mx-auto mb-8 relative'> 
                        <div className='absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse'></div> 
                        <div className='relative w-full h-full border border-white/20 flex items-center justify-center rounded-full overflow-hidden'> 
                          <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </div> 
                      </div> 
                      <h2 className='text-2xl font-serif italic text-white mb-2 leading-tight'>"Synthesizing reality anchor..."</h2>
                      <p className="text-[10px] uppercase tracking-widest text-[#999]">This requires temporal processing</p>
                    </div>
                  ) : mem.status === 'completed' && mem.operationName ? (
                    <video 
                      src={`/api/video-download?operationName=${mem.operationName}`} 
                      controls 
                      autoPlay 
                      loop 
                      muted 
                      className="w-full h-full object-cover z-10 relative"
                    />
                  ) : (
                    <div className='relative z-10 text-center px-12 flex flex-col items-center'>
                      <div className='w-32 h-32 mx-auto mb-8 relative'> 
                        <div className='absolute inset-0 bg-red-900/20 rounded-full blur-2xl'></div> 
                        <div className='relative w-full h-full border border-red-900/50 flex items-center justify-center rounded-full overflow-hidden'> 
                          <Video className="w-10 h-10 text-red-500/50" />
                        </div> 
                      </div> 
                      <h2 className='text-2xl font-serif italic text-white mb-2 leading-tight'>"Synthesis Collapsed"</h2>
                      <p className="text-[10px] uppercase tracking-widest text-[#666]">Visual generation failed</p>
                    </div>
                  )}
                </div> 
                
                <div className='mt-8 w-full'> 
                  <div className='flex justify-between items-start gap-4'> 
                    <div className="flex-1"> 
                      <h3 className='text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-[0.2em]'>Visual Synthesis Log</h3> 
                      <p className='text-base font-light text-white leading-relaxed'>{mem.content}</p> 
                    </div> 
                    <div className='text-right pt-1'> 
                      <span className='px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-tighter text-white inline-block whitespace-nowrap'>
                        {mem.category}
                      </span> 
                    </div> 
                  </div> 
                </div> 
              </div>
            ))
          )}
        </div> 
      </div> 
    </div>
  );
}
