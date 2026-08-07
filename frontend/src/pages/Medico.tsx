import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, CheckCircle2, Fingerprint, RefreshCcw, 
  ShieldCheck, Lock, Activity, Server, User, Calendar, Pill, Check, Loader2, FileSignature
} from 'lucide-react';

export default function Medico() {
  const [patient, setPatient] = useState('');
  const [drugCode, setDrugCode] = useState(''); // Ahora inicia vacío para que el médico escriba
  const [expiryDate, setExpiryDate] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [cryptoData, setCryptoData] = useState({ shortId: '', nonce: '', commitment: '' });
  
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Initializing secure environment...",
    "Generating random Patient Nonce...",
    "Calculating cryptographic Commitment...",
    "Registering with ZK-Rollup Network..."
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'loading') {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 600);
    }
    return () => clearInterval(interval);
  }, [status]);

  const issuePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // MOCK Backend response: POST /api/medico/recetas
    setTimeout(() => {
      const shortId = `rx_${Math.random().toString(36).substring(2, 8)}`;
      const nonce = `nonce_${Math.random().toString(36).substring(2, 12)}`;
      const commitment = `0x${Math.random().toString(16).substring(2, 16)}...${Math.random().toString(16).substring(2, 6)}`;
      
      setCryptoData({ shortId, nonce, commitment });
      
      // OPTION C: Save to localStorage so Patient.tsx can consume it
      localStorage.setItem(`zk_${shortId}`, JSON.stringify({ 
        nonce, 
        commitment, 
        medicamento: drugCode, // Guardamos lo que el médico tipeó
        vigencia: expiryDate   
      }));

      setStatus('success');
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] relative py-10 px-4 sm:px-6 font-sans">
      
      {/* Subtle Pseudo-Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-in fade-in duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                Clinical Portal
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Lock className="w-3 h-3" /> E2E Encrypted
              </span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
              Prescription Issuance
            </h1>
          </div>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Profile and Status */}
          <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            
            {/* Doctor Profile Card */}
            <div className="bg-white rounded-[2rem] p-6 border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center p-1">
                  <div className="w-full h-full bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-zinc-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-900 leading-tight">Dr. Alejandro García</h2>
                  <p className="text-xs font-semibold text-zinc-500 mt-0.5">Clinical Cardiology</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">License No.</span>
                  <span className="text-sm font-mono font-bold text-zinc-700">MN-145892</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Facility</span>
                  <span className="text-sm font-semibold text-zinc-700">Health Network</span>
                </div>
              </div>
            </div>

            {/* Backend Node Status Card */}
            <div className="bg-zinc-950 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 opacity-10 group-hover:opacity-20 transition-opacity">
                <Server className="w-40 h-40 text-white" />
              </div>
              
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Network Status</h3>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">API Connected</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Commitment Generation OK</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Issuance Form */}
          <div className="lg:col-span-8 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="bg-white rounded-[2rem] border border-zinc-200/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden min-h-[480px] flex flex-col relative">
              
              {/* Subtle top-right glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

              {status === 'idle' && (
                <div className="p-8 sm:p-10 flex-1 z-10">
                  <div className="mb-10 pb-6 border-b border-zinc-100">
                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight">New Secure Prescription</h2>
                    <p className="text-sm font-medium text-zinc-500 mt-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Patient identity data will not leave this device.
                    </p>
                  </div>

                  <form onSubmit={issuePrescription} className="space-y-8">
                    
                    {/* SECTION 1: Identity */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest pl-1">Identity (Local Use)</h3>
                      
                      <div className="group relative rounded-[1.5rem] bg-zinc-50/50 border border-zinc-200/80 p-4 transition-all duration-300 hover:bg-zinc-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-white shadow-sm border border-zinc-100 group-focus-within:border-indigo-200 group-focus-within:bg-indigo-50 transition-colors duration-300">
                            <User className="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-focus-within:text-indigo-600 transition-colors">Patient Name</label>
                            <input
                              type="text"
                              required
                              value={patient}
                              onChange={(e) => setPatient(e.target.value)}
                              placeholder="e.g., John Doe"
                              className="w-full bg-transparent p-0 text-base font-bold text-zinc-900 focus:outline-none placeholder:text-zinc-300 placeholder:font-medium mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Clinical Details */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest pl-1">Clinical Details</h3>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        
                        {/* INPUT DE TEXTO LIBRE PARA EL MEDICAMENTO */}
                        <div className="group relative rounded-[1.5rem] bg-zinc-50/50 border border-zinc-200/80 p-4 transition-all duration-300 hover:bg-zinc-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-white shadow-sm border border-zinc-100 group-focus-within:border-indigo-200 group-focus-within:bg-indigo-50 transition-colors duration-300">
                              <Pill className="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-600" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-focus-within:text-indigo-600 transition-colors">Drug Name / Code</label>
                              <input
                                type="text"
                                required
                                value={drugCode}
                                onChange={(e) => setDrugCode(e.target.value)}
                                placeholder="e.g., Amoxicillin 500mg"
                                className="w-full bg-transparent p-0 text-sm font-bold text-zinc-900 focus:outline-none placeholder:text-zinc-300 placeholder:font-medium mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Date Field */}
                        <div className="group relative rounded-[1.5rem] bg-zinc-50/50 border border-zinc-200/80 p-4 transition-all duration-300 hover:bg-zinc-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-white shadow-sm border border-zinc-100 group-focus-within:border-indigo-200 group-focus-within:bg-indigo-50 transition-colors duration-300">
                              <Calendar className="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-focus-within:text-indigo-600 transition-colors">Expiry Date</label>
                              <input
                                type="date"
                                required
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full bg-transparent p-0 text-sm font-bold text-zinc-900 focus:outline-none mt-1"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Cryptographic Glow Submit Button */}
                    <div className="pt-8">
                      <button
                        type="submit"
                        className="group relative w-full overflow-hidden rounded-[1.5rem] bg-zinc-950 p-[1px] transition-transform active:scale-[0.98]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-40 blur-sm group-hover:opacity-70 transition-opacity duration-500"></div>
                        
                        <div className="relative flex w-full items-center justify-center gap-3 rounded-[23px] bg-zinc-950/90 px-4 py-5 text-sm font-bold text-white backdrop-blur-xl transition-colors group-hover:bg-zinc-900 shadow-inner">
                          <FileSignature className="h-5 w-5 text-indigo-400" />
                          Sign & Issue Prescription
                        </div>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LOADING STATE: Crypto Terminal */}
              {status === 'loading' && (
                <div className="p-8 sm:p-10 flex-1 bg-zinc-950 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-[pulse_2s_ease-in-out_infinite]"></div>
                  
                  <div className="mb-8 z-10">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
                    <h2 className="text-2xl font-black text-white tracking-tight">Processing Transaction</h2>
                  </div>

                  <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-5 font-mono text-[11px] sm:text-xs z-10 shadow-inner">
                    {loadingMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center gap-3 py-2 transition-all duration-300 ${
                          index < loadingStep ? 'text-emerald-400' : 
                          index === loadingStep ? 'text-white font-bold' : 'text-zinc-600 opacity-50'
                        }`}
                      >
                        {index < loadingStep ? <Check className="w-4 h-4 shrink-0" /> : 
                         index === loadingStep ? <span className="w-4 h-4 shrink-0 flex items-center justify-center text-indigo-400 animate-pulse">▶</span> : 
                         <span className="w-4 h-4 shrink-0 flex items-center justify-center text-zinc-600">·</span>}
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUCCESS STATE: Blockchain Receipt */}
              {status === 'success' && (
                <div className="p-8 sm:p-10 flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-8 border-emerald-100/50 mb-6 relative">
                    <div className="absolute inset-0 rounded-full border border-emerald-200 animate-[ping_2s_ease-in-out_infinite] opacity-20"></div>
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Prescription Issued</h2>
                  <p className="text-sm font-medium text-zinc-500 max-w-sm mb-8">
                    The backend returned the Commitment and Nonce. (Saved locally for Demo purposes).
                  </p>

                  <div className="w-full max-w-md bg-zinc-950 rounded-[2rem] p-7 text-left relative overflow-hidden shadow-2xl mb-8">
                    <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                      <Server className="w-48 h-48 text-white -translate-y-10 translate-x-10" />
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Short ID</span>
                        <p className="font-mono text-sm text-white font-bold">{cryptoData.shortId}</p>
                      </div>
                      <div className="pt-4 border-t border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Patient Nonce</span>
                        <p className="font-mono text-sm text-indigo-400 font-bold">{cryptoData.nonce}</p>
                      </div>
                      <div className="pt-4 border-t border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Commitment</span>
                        <p className="font-mono text-[10px] text-emerald-400 font-bold break-all">{cryptoData.commitment}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setStatus('idle');
                      setPatient('');
                      setExpiryDate('');
                      setDrugCode(''); // Limpiamos el texto al resetear
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Issue another prescription
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}