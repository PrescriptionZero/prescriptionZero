import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Wallet, Activity,
  LockKeyhole, Server, Fingerprint, HelpCircle,
  ChevronDown, Stethoscope, User, Store
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'paciente' | 'medico' | 'farmacia'>('paciente');

  // MOCK: Simulation of Lace connection and role-based redirection
  const handleConnect = () => {
    setIsConnecting(true);
    
    // Real logic would go here:
    // 1. const wallet = await connectLace();
    // 2. const role = await backend.getUserRole(wallet.address);
    // 3. navigate(`/${role}`);

    setTimeout(() => {
      setIsConnecting(false);
      navigate(`/${selectedRole}`);
    }, 1500);
  };

  const features = [
    {
      icon: <LockKeyhole className="w-6 h-6 text-indigo-500" />,
      title: "Zero-Knowledge Cryptography",
      description: "Prescriptions are validated without revealing the patient's identity using ZK-SNARK proofs. Absolute privacy by design."
    },
    {
      icon: <Wallet className="w-6 h-6 text-indigo-500" />,
      title: "Native Lace Integration",
      description: "Sign transactions and generate zero-knowledge proofs directly from your wallet, without intermediaries."
    },
    {
      icon: <Server className="w-6 h-6 text-indigo-500" />,
      title: "Anti-Double Spending",
      description: "The network automatically prevents the same prescription from being dispensed twice, ensuring clinical safety."
    }
  ];

  const faqs = [
    {
      q: "What is a Zero-Knowledge (ZK) proof?",
      a: "It is a cryptographic method that allows one party (the patient) to prove to another (the pharmacy) that a statement is true (they have a valid prescription) without revealing any other information (their identity or medical history)."
    },
    {
      q: "Do I need cryptocurrencies to use the platform?",
      a: "No. The architecture runs on an optimized ZK-Rollup. Network fees (gas) are abstracted for the end user, allowing for a seamless, frictionless experience."
    },
    {
      q: "How is my medical data protected?",
      a: "Names and sensitive data never leave the doctor's device. Only an encrypted 'Commitment' is issued to the network. The patient then proves ownership of that hash using a secret 'Nonce'."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFB] font-sans selection:bg-indigo-500/30">
      
      {/* Subtle Background Pseudo-Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-zinc-950 text-white shadow-lg">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="text-xl font-black tracking-tight text-zinc-900">
              Prescription<span className="text-indigo-600">Zero</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-500">
            <a href="#platform" className="hover:text-zinc-900 transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-zinc-900 transition-colors">How it Works</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24">
        
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 mb-32 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Mainnet Live V2.0
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight leading-[1.1] mb-6">
              Medical Privacy in the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Web3 Era</span>.
            </h1>
            <p className="text-lg text-zinc-500 font-medium leading-relaxed mb-8 max-w-lg">
              The first decentralized protocol for issuing and dispensing clinical prescriptions using zero-knowledge proofs (zk-SNARKs).
            </p>
            <div className="flex items-center gap-4 text-sm font-bold text-zinc-400 uppercase tracking-widest">
              <Fingerprint className="w-5 h-5 text-zinc-300" /> No central databases
            </div>
          </div>

          {/* LOGIN CARD (CONNECT LACE) */}
          <div className="relative animate-in zoom-in-95 duration-700 delay-200">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-2xl rounded-[3rem]"></div>
            
            <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-200/60 shadow-2xl relative">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-100">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900">Access Portal</h2>
                  <p className="text-sm font-medium text-zinc-500 mt-1">Connect your wallet to operate on the network</p>
                </div>
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-indigo-600" />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Simulate Wallet Profile</label>
                  <div className="mt-2 grid grid-cols-3 gap-2 bg-zinc-50/50 p-1.5 rounded-2xl border border-zinc-200/60">
                    <button 
                      onClick={() => setSelectedRole('paciente')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${selectedRole === 'paciente' ? 'bg-white shadow-sm border border-zinc-200/50 text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <User className="w-5 h-5" /> Patient
                    </button>
                    <button 
                      onClick={() => setSelectedRole('medico')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${selectedRole === 'medico' ? 'bg-white shadow-sm border border-zinc-200/50 text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <Stethoscope className="w-5 h-5" /> Doctor
                    </button>
                    <button 
                      onClick={() => setSelectedRole('farmacia')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${selectedRole === 'farmacia' ? 'bg-white shadow-sm border border-zinc-200/50 text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <Store className="w-5 h-5" /> Pharmacy
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="group relative w-full overflow-hidden rounded-[1.5rem] bg-zinc-950 p-[1px] transition-transform active:scale-[0.98] disabled:opacity-80"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50 blur-sm group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex w-full items-center justify-center gap-3 rounded-[23px] bg-zinc-950/90 px-4 py-5 text-sm font-bold text-white backdrop-blur-xl transition-colors group-hover:bg-zinc-900">
                    {isConnecting ? (
                      <>
                        <Activity className="w-5 h-5 animate-spin text-indigo-400" />
                        Negotiating with Lace...
                      </>
                    ) : (
                      <>
                        <LockKeyhole className="h-5 w-5 text-indigo-400" />
                        Connect Lace Wallet
                      </>
                    )}
                  </div>
                </button>
                
                <p className="text-[10px] text-center text-zinc-400 font-bold uppercase tracking-widest pt-2">
                  Powered by Midnight Network
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="platform" className="border-y border-zinc-200/50 bg-white py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">How does it transform the industry?</h2>
              <p className="text-zinc-500 font-medium">PrescriptionZero eliminates reliance on vulnerable central servers, returning data control to the patient.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                  <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-24 max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-3xl border border-zinc-200/60 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer select-none">
                  <span className="font-bold text-zinc-900">{faq.q}</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-2 text-sm font-medium text-zinc-500 leading-relaxed border-t border-zinc-50 mt-2">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}