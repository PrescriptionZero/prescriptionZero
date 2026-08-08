import { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Clock, QrCode, AlertCircle, Loader2,
  ShieldCheck, X, Fingerprint, Bell, Activity,
  Zap, ChevronRight, ScanLine, FileText, Store, Wallet, LockKeyhole, RefreshCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import { listarMisRecetas, verReceta, generarQr, ApiError } from '../services/api';
import { useWalletConnection } from '../hooks/useWalletConnection';

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  distance: number;
  isOpen: boolean;
}

interface PrescriptionCard {
  short_id: string;
  drugCode: string;
  expiryDate: string;
  status: string;
  theme: string;
  icon: typeof Activity;
}

export default function Paciente() {
  // --- LACE WALLET (real, via DApp Connector API) ---
  const {
    status: walletStatus,
    isConnected,
    isConnecting,
    address: walletAddress,
    error: walletError,
    connect,
  } = useWalletConnection();

  // --- APP STATE ---
  const [backendPrescriptions, setBackendPrescriptions] = useState<PrescriptionCard[]>([]);
  const [generatedQRs, setGeneratedQRs] = useState<Record<string, string>>({});
  const [proofStatus, setProofStatus] = useState<Record<string, 'idle' | 'proving' | 'success'>>({});
  const [proofError, setProofError] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<'prescription' | 'pharmacies'>('prescription');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locError, setLocError] = useState('');
  
  const [qrTimer, setQrTimer] = useState(299);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showingQR = Object.keys(generatedQRs).length > 0;

  // Timer logic for the QR
  useEffect(() => {
    if (showingQR) {
      const interval = setInterval(() => setQrTimer(prev => (prev > 0 ? prev - 1 : 299)), 1000);
      return () => clearInterval(interval);
    }
  }, [showingQR]);

  // FLOW 1: Connect Lace — real DApp Connector API call (useWalletConnection).
  // Errors (no wallet installed, user rejects, ...) surface via walletError.
  const handleConnectLace = () => {
    connect('preview').catch(() => {
      // walletError already holds the message; nothing else to do here.
    });
  };

  // FLOW 2: List Prescriptions (GET /api/paciente/mis-recetas)
  const fetchMyPrescriptions = async (wallet: string) => {
    try {
      const recetas = await listarMisRecetas(wallet);
      setBackendPrescriptions(
        recetas.map((r) => ({
          short_id: r.id_corto,
          drugCode: r.drugCode,
          expiryDate: r.expiryDate,
          status: 'Authorized',
          theme: 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900',
          icon: Activity,
        })),
      );
    } catch (err) {
      console.error('Failed to list prescriptions:', err);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchMyPrescriptions(walletAddress);
    }
  }, [isConnected, walletAddress]);

  // Auto-refresh (Option A): while at least one QR is on screen, poll the
  // backend every 3s so a pharmacy validating the prescription elsewhere
  // makes it disappear from this list almost immediately (backend now
  // filters usada=false, see db.service.ts). showingQR is derived from
  // generatedQRs above — nothing extra to keep in sync.
  useEffect(() => {
    if (!walletAddress || !showingQR) return;

    const interval = setInterval(() => {
      fetchMyPrescriptions(walletAddress);
    }, 3000);

    // Stop polling after 2 minutes even if a QR is still visible, so an
    // abandoned tab doesn't hammer the backend forever.
    const timeout = setTimeout(() => clearInterval(interval), 120_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [walletAddress, showingQR]);

  // Manual refresh (Option B).
  const handleRefreshRecetas = async () => {
    if (!walletAddress) return;
    setIsRefreshing(true);
    try {
      await fetchMyPrescriptions(walletAddress);
    } finally {
      setIsRefreshing(false);
    }
  };

  // FLOW 3: View Details (ZK Proof with Lace) + FLOW 4: Generate Pharmacy QR
  const generateZKProof = async (prescription: PrescriptionCard) => {
    if (!walletAddress) return; // guarded by isConnected in the UI, but keep TS honest

    setProofStatus(prev => ({ ...prev, [prescription.short_id]: 'proving' }));
    setProofError(prev => ({ ...prev, [prescription.short_id]: '' }));

    try {
      // Wallet CONNECTION above is real (useWalletConnection, DApp Connector
      // API). Proof generation is not — that additionally needs a contract
      // actually deployed on-chain (CONTRACT_ADDRESS is still a placeholder
      // in backend/.env), ZK assets hosted over HTTP, and the full
      // midnight-js provider pipeline (.agents/skills/1am-wallet section 6-8).
      // Once that exists, this becomes:
      //   const noncePaciente = localStorage.getItem(`nonce_${prescription.short_id}`);
      //   const callTxData = await createUnprovenCallTx(session.providers, {
      //     compiledContract, contractAddress, circuitId: 'provePatientOwnership',
      //     args: [commitmentBytes, noncePacienteBytes],
      //   });
      //   const proof = await submitTxAsync(session.providers, { unprovenTx: callTxData.private.unprovenTx });
      // Until then: the backend's verificarProofPropiedad accepts any string
      // except the literal "proof_invalida" (see backend/src/services/contract.service.ts).
      const proof = 'mock-proof';

      // 1. Backend verifies the proof against the stored commitment.
      await verReceta(prescription.short_id, walletAddress, proof);

      // 2. Success: ask the backend for the pharmacy-scannable QR.
      const qrDataUrl = await generarQr(prescription.short_id);

      setGeneratedQRs(prev => ({ ...prev, [prescription.short_id]: qrDataUrl }));
      setProofStatus(prev => ({ ...prev, [prescription.short_id]: 'success' }));
      setQrTimer(299);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof ApiError && err.status === 403
          ? "Unauthorized: this prescription doesn't belong to you"
          : 'Could not verify this prescription. Try again.';
      setProofError(prev => ({ ...prev, [prescription.short_id]: message }));
      setProofStatus(prev => ({ ...prev, [prescription.short_id]: 'idle' }));
    }
  };

  const closeQR = (shortId: string) => {
    setGeneratedQRs(prev => {
      const newState = { ...prev };
      delete newState[shortId];
      return newState;
    });
    setProofStatus(prev => ({ ...prev, [shortId]: 'idle' }));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const findNearbyPharmacies = () => {
    setIsLoading(true);
    setLocError('');
    
    if (!navigator.geolocation) {
      setLocError('Your browser does not support geolocation.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const query = `[out:json];node["amenity"="pharmacy"](around:2000,${latitude},${longitude});out 5;`;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          const data = await response.json();

          if (data.elements && data.elements.length > 0) {
            const realPharmacies = data.elements.map((el: any) => {
              const dist = calculateDistance(latitude, longitude, el.lat, el.lon);
              return {
                id: el.id,
                name: el.tags.name || "Partner Pharmacy",
                address: el.tags['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}` : "Address at counter",
                distance: dist,
                isOpen: Math.random() > 0.3 
              };
            });
            realPharmacies.sort((a: Pharmacy, b: Pharmacy) => a.distance - b.distance);
            setPharmacies(realPharmacies);
          } else {
            setLocError('No partner pharmacies found in your area.');
          }
        } catch (err) {
          setLocError('Error connecting to the server.');
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        setLocError('We need access to your location.');
        setIsLoading(false);
      }
    );
  };

  useEffect(() => {
    if (activeTab === 'pharmacies' && pharmacies.length === 0) {
      findNearbyPharmacies();
    }
  }, [activeTab]);

  const timeFormat = `${Math.floor(qrTimer / 60).toString().padStart(2, '0')}:${(qrTimer % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-50 to-zinc-200 flex flex-col items-center py-6 sm:py-10 px-4 font-sans">
      
      <div className="w-full max-w-[440px] bg-[#FAFAFA] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-zinc-200/50 rounded-[3rem] overflow-hidden flex flex-col min-h-[850px] relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* SCREEN 1: CONNECT LACE */}
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-20">
            <div className="w-24 h-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/20 relative">
              <div className="absolute inset-0 rounded-[2rem] border border-indigo-500/30"></div>
              <Wallet className="w-10 h-10 text-indigo-400" />
            </div>
            
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight text-center mb-2">ZK Vault</h1>
            <p className="text-sm font-medium text-zinc-500 text-center mb-10">
              Connect your Lace wallet to generate zero-knowledge proofs and access your prescriptions.
            </p>

            <button
              onClick={handleConnectLace}
              disabled={isConnecting || walletStatus === 'not-found'}
              className="group relative w-full overflow-hidden rounded-[1.5rem] bg-zinc-950 p-[1px] transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
              <div className="relative flex w-full items-center justify-center gap-3 rounded-[23px] bg-zinc-950/90 px-4 py-5 text-sm font-bold text-white backdrop-blur-xl transition-colors group-hover:bg-zinc-900">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                    Waiting for Lace authorization...
                  </>
                ) : (
                  <>
                    <LockKeyhole className="h-5 w-5 text-indigo-400" />
                    Connect Lace Wallet
                  </>
                )}
              </div>
            </button>

            {walletStatus === 'not-found' && (
              <p className="mt-4 text-xs font-semibold text-amber-600 text-center max-w-xs">
                No Midnight wallet extension detected. Install Lace and refresh this page.
              </p>
            )}
            {walletError && (
              <p className="mt-4 text-xs font-semibold text-rose-600 text-center max-w-xs">
                {walletError}
              </p>
            )}
          </div>
        ) : (
          
          /* SCREEN 2: MAIN WALLET (Prescriptions & ZK Proofs) */
          <>
            <div className="px-6 pt-10 pb-6 shrink-0 bg-white/70 backdrop-blur-2xl border-b border-zinc-200/50 sticky top-0 z-30">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-700 tracking-wide">ZK-ROLLUP ONLINE</span>
                </div>
                <button className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors relative">
                  <Bell className="w-4 h-4" />
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-zinc-100"></div>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-[2px] shadow-lg shadow-indigo-500/20">
                    <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                      <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-violet-500">
                        JP
                      </span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Private Wallet</p>
                  <h1 className="text-2xl font-extrabold text-zinc-900 leading-none">Juan Pérez</h1>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-3">
                  <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Active</p>
                    <p className="text-lg font-black text-zinc-900 leading-none">{backendPrescriptions.length} Scripts</p>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Security</p>
                    <p className="text-lg font-black text-zinc-900 leading-none">Maximum</p>
                  </div>
                </div>
              </div>

              <div className="flex bg-zinc-100 p-1.5 rounded-[1.25rem] border border-zinc-200/50 shadow-inner">
                <button 
                  onClick={() => setActiveTab('prescription')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'prescription' ? 'bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <ScanLine className="w-4 h-4" /> Prescriptions
                </button>
                <button 
                  onClick={() => setActiveTab('pharmacies')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === 'pharmacies' ? 'bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <MapPin className="w-4 h-4" /> Nearby Network
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12 relative z-20 scrollbar-hide">
              
              {activeTab === 'prescription' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-5">
                  <div className="flex justify-between items-end px-1 mb-2">
                    <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Health Wallet</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleRefreshRecetas}
                        disabled={isRefreshing}
                        className="text-xs text-indigo-600 font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-700 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                      <span className="text-xs text-zinc-400 font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Encrypted</span>
                    </div>
                  </div>

                  {backendPrescriptions.length === 0 && (
                    <div className="text-center p-8 bg-white rounded-3xl border border-zinc-200">
                      <p className="text-sm font-bold text-zinc-500">No prescriptions issued yet. (Issue one from the doctor's panel).</p>
                    </div>
                  )}

                  {backendPrescriptions.map((prescription) => (
                    <div key={prescription.short_id} className="relative group">
                      
                      {/* Premium Metal Card */}
                      <div className={`relative w-full rounded-[2rem] p-6 overflow-hidden border shadow-xl transition-transform duration-300 border-zinc-800 ${prescription.theme}`}>
                        
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none"></div>
                        <div className="absolute -right-8 -bottom-8 opacity-5">
                          <prescription.icon className="w-64 h-64 text-white" strokeWidth={0.5} />
                        </div>
                        <div className="absolute top-6 right-6 text-white/20 font-serif text-8xl italic font-black select-none pointer-events-none">
                          Rx
                        </div>

                        <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
                          <div>
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-8 rounded-md border border-yellow-500/30 bg-gradient-to-br from-yellow-200/20 to-yellow-500/10 flex items-center justify-center backdrop-blur-sm shadow-sm">
                                  <div className="w-6 h-4 border border-yellow-500/40 rounded-sm flex flex-col justify-evenly px-1">
                                    <div className="w-full h-px bg-yellow-500/40"></div>
                                    <div className="w-full h-px bg-yellow-500/40"></div>
                                  </div>
                                </div>
                                <span className="bg-white/10 text-white border border-white/20 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md">
                                  Locked
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Backend ID</p>
                                <p className="font-mono text-xs text-white/80 mt-0.5">{prescription.short_id}</p>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-2xl font-extrabold tracking-tight mb-1 text-white">
                                {prescription.drugCode}
                              </h3>
                              <p className="text-sm font-semibold text-white/70">
                                Expires: {prescription.expiryDate}
                              </p>
                            </div>
                          </div>

                          {/* ACTION AREA: Lace Circuit Integration */}
                          <div className="mt-6 pt-5 border-t border-white/10">
                            {proofStatus[prescription.short_id] !== 'success' ? (
                              <button 
                                onClick={() => generateZKProof(prescription)}
                                disabled={proofStatus[prescription.short_id] === 'proving'}
                                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 backdrop-blur-md shadow-lg disabled:opacity-50"
                              >
                                {proofStatus[prescription.short_id] === 'proving' ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authorizing in Lace...
                                  </>
                                ) : (
                                  <>
                                    <QrCode className="w-5 h-5" />
                                    Generate ZK Proof
                                  </>
                                )}
                              </button>
                            ) : null}
                            {proofError[prescription.short_id] && (
                              <p className="mt-3 text-xs font-semibold text-rose-400 text-center">
                                {proofError[prescription.short_id]}
                              </p>
                            )}
                            {proofStatus[prescription.short_id] === 'success' && (

                              /* POST-PROOF QR CODE */
                              <div className="w-full animate-in zoom-in-95 duration-300 bg-white rounded-[1.5rem] p-5 shadow-2xl relative overflow-hidden text-zinc-900 border border-zinc-100">
                                
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 animate-[pulse_2s_ease-in-out_infinite]"></div>

                                <div className="flex justify-between items-center mb-4">
                                   <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Proof Accepted</p>
                                     <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-0.5">
                                       <Clock className="w-3 h-3" /> Expires in {timeFormat}
                                     </p>
                                   </div>
                                   <button 
                                    onClick={() => closeQR(prescription.short_id)}
                                    className="text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 p-1.5 rounded-full transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <div className="bg-white p-3 rounded-2xl border-2 border-zinc-100 shadow-sm mx-auto w-fit relative group mb-3">
                                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-600 rounded-tl-xl"></div>
                                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-600 rounded-tr-xl"></div>
                                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-600 rounded-bl-xl"></div>
                                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-600 rounded-br-xl"></div>
                                  
                                  <img src={generatedQRs[prescription.short_id]} alt="QR" className="w-40 h-40 object-contain" />
                                </div>
                                
                                <div className="bg-indigo-50 rounded-xl p-2.5 flex items-start gap-2 border border-indigo-100/50">
                                  <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                  <p className="text-[10px] text-indigo-800 font-medium leading-tight">
                                    Show this code to the pharmacist. Please maximize screen brightness.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pharmacies' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-4">
                  
                  <div className="flex justify-between items-end px-1 mb-2">
                    <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Authorized Pharmacies</h2>
                    <span className="text-xs text-zinc-400 font-medium flex items-center gap-1"><MapPin className="w-3 h-3"/> ZK Radar</span>
                  </div>

                  {isLoading && (
                    <div className="bg-white rounded-[2rem] p-8 border border-zinc-200/60 shadow-sm flex flex-col items-center justify-center text-center gap-4 h-64">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-zinc-100"></div>
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
                        <MapPin className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div>
                        <p className="text-zinc-900 font-bold">Scanning area...</p>
                        <p className="text-zinc-500 font-medium text-xs mt-1">Searching for compatible nodes</p>
                      </div>
                    </div>
                  )}

                  {locError && !isLoading && (
                    <div className="bg-white rounded-[2rem] p-6 border-2 border-rose-100 shadow-sm text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-rose-500" />
                      </div>
                      <p className="text-zinc-900 font-bold mb-1">Location required</p>
                      <p className="text-zinc-500 text-sm mb-6 max-w-[250px]">{locError}</p>
                      <Button variant="destructive" className="w-full rounded-xl" onClick={findNearbyPharmacies}>
                        Allow access
                      </Button>
                    </div>
                  )}

                  {!isLoading && !locError && pharmacies.map((pharmacy, index) => (
                    <div 
                      key={pharmacy.id} 
                      className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200/60 flex flex-col gap-3 group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 bg-zinc-50 border border-zinc-200/60 p-2.5 rounded-2xl group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors">
                            <Store className="h-5 w-5 text-zinc-600 group-hover:text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900 leading-tight pr-2">
                              {pharmacy.name}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1 font-medium">
                              {pharmacy.address}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${pharmacy.isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                          {pharmacy.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      
                      <div className="pt-3 mt-1 border-t border-zinc-100 flex justify-between items-center">
                        <p className="text-xs text-zinc-600 flex items-center gap-1.5 font-bold">
                          <Navigation className="h-3.5 w-3.5 text-indigo-500" />
                          {pharmacy.distance} meters away
                        </p>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}