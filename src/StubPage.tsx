import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function StubPage({ title }: { title: string }) {
  return (
    <div className="bg-[#09090b] min-h-screen flex flex-col font-['Montserrat:Regular',sans-serif] text-white overflow-x-hidden selection:bg-white/20">
      <div className="w-full flex justify-center z-50">
        <Frame1 />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative p-6 mt-20 md:mt-0">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#004eff]/20 to-transparent rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="bg-white/5 border border-white/10 p-12 md:p-20 rounded-3xl backdrop-blur-md flex flex-col items-center text-center max-w-2xl w-full">
          <div className="size-20 bg-white/10 rounded-full flex items-center justify-center mb-8 border border-white/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="font-['Montserrat:SemiBold',sans-serif] text-[32px] md:text-[48px] mb-4">
            {title}
          </h1>
          <p className="text-white/60 text-[18px] max-w-md">
            This section is currently under development. Check back soon for updates!
          </p>
          
          <a href="/" className="mt-10 bg-white text-black font-['Montserrat:SemiBold',sans-serif] px-8 py-4 rounded-xl hover:bg-white/90 transition-all">
            Return Home
          </a>
        </div>
      </div>

      <div className="w-full mt-auto">
        <Frame71 />
      </div>
    </div>
  );
}
