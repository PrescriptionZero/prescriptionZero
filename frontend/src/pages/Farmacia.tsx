import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Store, Camera, CheckCircle2, XCircle, ShieldAlert,
  FileText, RefreshCw, X, ShieldCheck, ScanLine,
  Activity, Lock
} from 'lucide-react';
import { validarReceta, ApiError } from '../services/api';

export default function Farmacia() {
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const [medData, setMedData] = useState({ name: '', expiry: '' });

  // Backend is the source of truth for whether a receta was already used
  // (usada flag + nullifier, see backend/README.md section 5) — no need to
  // track scan history locally anymore.
  const validatePrescription = async (idCortoEscaneado: string) => {
    if (!idCortoEscaneado) return;

    try {
      const result = await validarReceta(idCortoEscaneado);
      if (result.valido) {
        setValidationResult('valid');
        setMessage('ZK-Proof Authorized');
        setMedData({ name: result.medicamento, expiry: result.vigente_hasta });
      } else {
        setValidationResult('invalid');
        setMessage(result.motivo);
        setMedData({ name: '', expiry: '' });
      }
    } catch (err) {
      setValidationResult('invalid');
      setMessage(err instanceof ApiError ? err.message : 'Connection error');
      setMedData({ name: '', expiry: '' });
    }
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    if (isScanning) {
      html5QrCode = new Html5Qrcode("qr-reader");
      
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            validatePrescription(decodedText);
          }).catch(console.error);
        },
        () => {
          // Frame errors ignored safely
        }
      ).catch((err) => {
        console.error("Error starting camera", err);
        setIsScanning(false);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]); 

  return (
    <div className="min-h-screen bg-[#FBFBFB] relative py-10 px-4 sm:px-6 font-sans">
      
      {/* Subtle Background Pseudo-Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Terminal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-in fade-in duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3" /> Operational Node
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Store className="w-3 h-3" /> Central Branch
              </span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
              ZK POS Terminal
            </h1>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Scanner (Dark Hardware Style) */}
          <div className="bg-zinc-950 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[520px] border border-zinc-800 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-extrabold text-white">Dispensing Reader</h2>
              <ShieldCheck className="w-6 h-6 text-zinc-600" />
            </div>
            
            {!isScanning ? (
              <div className="flex-1 flex flex-col justify-center">
                <button 
                  onClick={() => {
                    setValidationResult('idle');
                    setIsScanning(true);
                  }}
                  className="group relative w-full overflow-hidden rounded-[2rem] bg-zinc-900 p-[1px] transition-transform active:scale-[0.98] mb-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 opacity-40 blur-sm group-hover:opacity-70 transition-opacity duration-500"></div>
                  <div className="relative flex w-full flex-col items-center justify-center gap-4 rounded-[31px] bg-zinc-900 px-4 py-12 text-white backdrop-blur-xl transition-colors group-hover:bg-zinc-800">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Camera className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">Activate Optical Reader</p>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Requires camera permission</p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col mb-8 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Scanner Active
                  </span>
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* HUD Scanner Container */}
                <div className="relative rounded-3xl bg-black border-2 border-zinc-800 overflow-hidden shadow-inner group flex items-center justify-center min-h-[300px]">
                  
                  {/* Focus Corners */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-amber-500 z-10 rounded-tl-lg"></div>
                  <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-amber-500 z-10 rounded-tr-lg"></div>
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-amber-500 z-10 rounded-bl-lg"></div>
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-amber-500 z-10 rounded-br-lg"></div>
                  
                  {/* Laser Line */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>

                  {/* Video Container */}
                  <div id="qr-reader" className="w-full h-full [&_video]:w-full [&_video]:object-contain border-none outline-none"></div>
                </div>
              </div>
            )}
            
            {/* Footer Security Text */}
            <div className="mt-auto pt-6 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
              <Lock className="w-3 h-3" />
              Optical QR Code Validation Only
            </div>
          </div>

          {/* RIGHT COLUMN: Results Display */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-zinc-200/60 flex flex-col items-center justify-center min-h-[520px] text-center relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-200">
            
            {validationResult === 'idle' && (
              <div className="text-zinc-400 flex flex-col items-center justify-center w-full">
                <div className="w-24 h-24 rounded-[2rem] bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center mb-6 relative">
                  <ScanLine className="w-10 h-10 text-zinc-300" />
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                    <Lock className="w-5 h-5 text-zinc-300" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Terminal Standby</h3>
                <p className="text-sm text-zinc-500 font-medium max-w-[260px]">
                  Position the patient's QR code in front of the camera to verify transaction.
                </p>
              </div>
            )}

            {validationResult === 'valid' && (
              <div className="animate-in zoom-in-95 duration-500 w-full flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                  <div className="bg-emerald-50 text-emerald-600 w-24 h-24 rounded-full flex items-center justify-center relative border-4 border-emerald-100 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">{message}</h3>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full mb-8 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cryptographic Proof Verified</span>
                </div>
                
                <div className="w-full bg-zinc-50 rounded-[2rem] p-6 border border-zinc-200/80 text-left relative overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 mb-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dispensing Authorization</span>
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Drug Name</p>
                      <p className="font-black text-xl text-zinc-900">{medData.name}</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-zinc-100">
                      <div className="bg-indigo-50 p-2 rounded-lg">
                        <Activity className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Network State</p>
                        <p className="text-xs font-bold text-zinc-900">Consumed & Recorded</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setValidationResult('idle')}
                  className="mt-8 flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors bg-white px-6 py-3 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  Next Patient
                </button>
              </div>
            )}

            {validationResult === 'invalid' && (
              <div className="animate-in shake duration-500 w-full flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-20"></div>
                  <div className="bg-rose-50 text-rose-600 w-24 h-24 rounded-full flex items-center justify-center relative border-4 border-rose-100 shadow-xl shadow-rose-500/20">
                    <XCircle className="w-12 h-12" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-rose-600 tracking-tight mb-2">{message}</h3>
                <p className="text-sm font-medium text-zinc-500 max-w-sm mb-8">
                  Transaction denied by ZK-Rollup network.
                </p>

                <div className="w-full bg-rose-50/50 rounded-[2rem] p-6 border-2 border-rose-100 text-left relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                    <ShieldAlert className="w-32 h-32 text-rose-500 -translate-y-6 translate-x-6" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                      <ShieldAlert className="w-5 h-5" />
                      <span className="font-bold uppercase tracking-widest text-xs">Protection Triggered</span>
                    </div>
                    <h4 className="font-black text-lg text-rose-900 mb-1">Invalid or Used Hash</h4>
                    <p className="text-xs font-medium text-rose-700/80 leading-relaxed">
                      This prescription has already been dispensed or does not match a valid issue. <strong>Withhold medication.</strong>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setValidationResult('idle')}
                  className="mt-8 flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors bg-white px-6 py-3 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  Scan Again
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}