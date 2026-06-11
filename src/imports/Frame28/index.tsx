import { Link, useLocation } from 'react-router';
import svgPaths from "./svg-jdc2ki7j7h";
import img202604292143111 from "./b763b0a0c62ed6189c17a21389dcf92691e56a9d.png";
import imgImage1 from "./8db2f9ecea5ebe90a67ef819abf5dc64a0577460.png";
import imgImage2 from "./300377b171442aada5f191e6a0011644a0a79859.png";
import imgImage5 from "./05ce510d761ab735224f9b21077dd1e7b8c7d3d2.png";
import imgImage3 from "./0dc125efbd9d0081a0c72414aa3f3a4750f3b58d.png";
import imgImage4 from "./99884eaf0688491d48ce1207a2cd12b8ff8ee0e6.png";
import img202606091844591 from "./05185548fab2f91d1b152b059813929b55bddbfa.png";
import img202606091908241 from "./3bd384c4cd47ce84af03b1cb1c432c2b5d063fcf.png";
import img202606091915481 from "./394c65866ae1c280eb7c5d72a36bb06178580e35.png";
import img202606091924471 from "./8ddc3ef606a4e21eca13a9f7df47d2c148fa343c.png";

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <div className="col-1 h-[100.211px] ml-[19.86px] mt-0 relative row-1 w-[93.27px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
      </div>
      <p className="[word-break:break-word] col-1 font-['Montserrat:Black',sans-serif] font-black leading-[normal] ml-0 mt-[100.21px] relative row-1 text-[24px] md:text-[30px] text-white whitespace-nowrap">FOLDED</p>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[15px] md:gap-[30px] items-center justify-center relative shrink-0 w-full px-4">
      <Group />
      <p className="[word-break:break-word] font-['Montserrat:Light',sans-serif] font-light leading-[normal] relative shrink-0 text-[16px] text-center text-white max-w-lg w-full">Truly unlimited, convenient personal storage from your Telegram.</p>
    </div>
  );
}

function Home() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="home">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="home">
          <path d={svgPaths.p2213f00} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M7.5 18.3333V10H12.5V18.3333" id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  const location = useLocation();
  const isActive = location.pathname === "/";
  return (
    <Link to="/" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <Home />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Home</p>
    </Link>
  );
}

function HelpCircle() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="help-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_301)" id="help-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p22540600} id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M10 14.1667H10.0083" id="Vector_3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_301">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame4() {
  const location = useLocation();
  const isActive = location.pathname === "/how-it-works";
  return (
    <Link to="/how-it-works" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <HelpCircle />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">How it work</p>
    </Link>
  );
}

function Download() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="download">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="download">
          <path d={svgPaths.p3053b100} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p37dcb700} id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M10 12.5V2.5" id="Vector_3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  const location = useLocation();
  const isActive = location.pathname === "/download";
  return (
    <Link to="/download" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <Download />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Download</p>
    </Link>
  );
}

function LifeBuoy() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="life-buoy">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_278)" id="life-buoy">
          <path d={svgPaths.p14d24500} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p20d10600} id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p16765880} id="Vector_3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p8e28b80} id="Vector_4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p1632e400} id="Vector_5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M12.3583 7.64167L15.3 4.7" id="Vector_6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p3f8c0480} id="Vector_7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_278">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame6() {
  const location = useLocation();
  const isActive = location.pathname === "/manual";
  return (
    <Link to="/manual" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <LifeBuoy />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Manual</p>
    </Link>
  );
}

function GitMerge() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="git-merge">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="git-merge">
          <path d={svgPaths.ped21a80} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p3808c500} id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p6e57b80} id="Vector_3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  const location = useLocation();
  const isActive = location.pathname === "/updates";
  return (
    <Link to="/updates" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <GitMerge />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Updates</p>
    </Link>
  );
}

function Github() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="github">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_275)" id="github">
          <path d={svgPaths.p48b43e0} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_275">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <a href="https://github.com/folded-app/folded" target="_blank" rel="noopener noreferrer" className="content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all text-white">
      <Github />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">GitHub</p>
    </a>
  );
}


export function Frame2() {
  return (
    <div className="content-stretch flex flex-wrap gap-[12px] md:gap-[24px] items-center justify-center relative shrink-0 px-4">
      <Frame3 />
      <Frame4 />
      <Frame5 />
      <Frame6 />
      <Frame7 />
      <Frame8 />
    </div>
  );
}

export function Frame1() {
  return (
    <div className="w-full flex flex-col gap-10 md:gap-[100px] items-center justify-center pt-[50px] md:h-[502px] z-10">
      <Frame13 />
      <Frame2 />
    </div>
  );
}


function Frame() {
  return (
    <div className="bg-[#09090b] min-h-[1024px] h-auto overflow-hidden relative shrink-0 w-full flex flex-col items-center">
      <Frame1 />
      <div className="relative w-full max-w-[1206.327px] mt-10 md:mt-0 md:-mt-10 px-4 flex justify-center z-0" data-name="Снимок экрана 2026-04-29 в 21.43.11 1">
        <img alt="" className="w-full h-auto object-contain pointer-events-none" src={img202604292143111} />
      </div>
    </div>
  );
}


function Frame10() {
  return (
    <div className="flex flex-col gap-[25px] items-center text-center text-white w-full max-w-[1320px] px-4 mx-auto">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[30px] w-full">What is Folded?</p>
      <p className="font-['Montserrat:Light',sans-serif] font-light text-[16px] w-full">Folded is an unofficial Telegram client that turns your account into a cloud drive.</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[315px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Given</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        Telegram offers unlimited cloud storage for your "Saved Messages", but it lacks the structure and organization of a proper file manager.
      </p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[315px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Folded</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        We implemented a fully-fledged cloud drive natively integrated within a sleek Telegram client, maintaining the high performance and security you expect.
      </p>
    </div>
  );
}

function Frame14() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[315px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Result</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        Your own infinitely scalable, free cloud drive built on top of the world's fastest messaging infrastructure.
      </p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="bg-[#09090b] relative w-full flex flex-col items-center py-20 px-4 lg:px-[60px] gap-[100px] overflow-hidden">
      <Frame10 />
      
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-[60px]">
        <Frame11 />
        <div className="relative w-full lg:w-[837px] rounded-[10px] aspect-[837/491]">
          <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={imgImage2} />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black]" />
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-['Montserrat:Bold_Italic',sans-serif] font-bold italic text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Illustration made by Telegram</p>
        </div>
      </div>
      
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10 lg:gap-0 pt-10">
        <div className="hidden lg:block relative w-full lg:w-[334px] rounded-[10px] aspect-[334/491]">
          <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={imgImage4} />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black]" />
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-['Montserrat:Bold_Italic',sans-serif] font-bold italic text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Illustration made by Telegram</p>
        </div>
        
        <Frame12 />
        
        <div className="relative w-full lg:w-[335px] rounded-[10px] aspect-[837/491] lg:aspect-[335/491]">
          <img alt="" className="absolute inset-0 size-full object-cover object-center rounded-[10px]" src={imgImage3} />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black]" />
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-['Montserrat:Bold_Italic',sans-serif] font-bold italic text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Illustration made by Telegram</p>
        </div>
      </div>
      
      <div className="w-full max-w-[1320px] flex flex-col-reverse lg:flex-row items-center lg:items-start gap-10 lg:gap-[60px] pt-10">
        <div className="relative w-full lg:w-[838px] rounded-[10px] aspect-[838/491]">
          <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={imgImage5} />
          <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black]" />
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-['Montserrat:Bold_Italic',sans-serif] font-bold italic text-[10px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">Illustration made by Telegram</p>
        </div>
        
        <Frame14 />
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Native File Explorer</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full">A powerful, built-in manager that transforms your Saved Messages from a simple chat into a fully-fledged, perfectly organized cloud drive.</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">A comprehensive, multi-level folder structure to keep your data perfectly organized.</p>
    </div>
  );
}

function Frame18() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Instantly sort, filter, and search through your files with lightning speed.</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Effortless batch management for files, groups, and entire directories.</p>
    </div>
  );
}

function Frame20() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Copy, paste, and move seamlessly—exactly the way you're used to.</p>
    </div>
  );
}

function Frame22() {
  return (
    <div className="flex flex-col gap-[25px] items-center text-center text-white w-full max-w-[1320px] mx-auto pt-12 pb-6">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">The Folded Experience</p>
      <p className="font-['Montserrat:Light',sans-serif] font-light text-[16px] w-full">Everything you expect from a premium cloud drive, engineered to perfection.</p>
    </div>
  );
}

function ArrowRightCircle() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[15px] text-white whitespace-nowrap">File Explorer Guide</p>
      <ArrowRightCircle />
    </div>
  );
}

function Frame24() {
  return (
    <div className="bg-[#09090b] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-opacity-80 transition-all">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[10px] relative size-full">
          <Frame25 />
        </div>
      </div>
    </div>
  );
}

function ArrowRightCircle1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">FAQ</p>
      <ArrowRightCircle1 />
    </div>
  );
}

function Frame26() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame27 />
    </div>
  );
}

function Frame23() {
  return (
    <div className="flex flex-col sm:flex-row lg:flex-row gap-[24px] items-start justify-center w-full lg:w-auto pt-[50px] lg:pt-0">
      <Frame24 />
      <Frame26 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="bg-gradient-to-t from-[#35c6ff] to-[#09090b] relative w-full flex flex-col items-center px-4 lg:px-[60px] pb-20 overflow-hidden">
      <Frame22 />
      
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-0 mt-10">
        <Frame16 />
        <Frame23 />
      </div>

      <div className="w-full max-w-[1440px] mt-16 relative aspect-[1440/1005]">
        <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={img202606091844591} />
      </div>

      <div className="w-full max-w-[1320px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">
        <Frame17 />
        <Frame18 />
        <Frame19 />
        <Frame20 />
      </div>
    </div>
  );
}

function Frame29() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Seamless Multi-Account</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full">Why stop at one? Connect multiple Telegram accounts simultaneously, seamlessly utilizing each one as a completely independent drive.</p>
    </div>
  );
}

function Frame30() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Unrestricted multi-account support. Need more drives? Just connect another account.</p>
    </div>
  );
}

function Frame31() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Operate across all your accounts at once, without the friction of logging in and out.</p>
    </div>
  );
}

function Frame32() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Monitor the real-time synchronization status of every connected account instantly.</p>
    </div>
  );
}

function Frame33() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Track the total storage footprint across each of your individual drives at a glance.</p>
    </div>
  );
}

function ArrowRightCircle2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[15px] text-white whitespace-nowrap">Account Center Guide</p>
      <ArrowRightCircle2 />
    </div>
  );
}

function Frame35() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame36 />
    </div>
  );
}

function ArrowRightCircle3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">FAQ</p>
      <ArrowRightCircle3 />
    </div>
  );
}

function Frame37() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame38 />
    </div>
  );
}

function Frame34() {
  return (
    <div className="flex flex-col sm:flex-row lg:flex-row gap-[24px] items-start justify-center w-full lg:w-auto pt-[50px] lg:pt-0">
      <Frame35 />
      <Frame37 />
    </div>
  );
}

function Frame28() {
  return (
    <div className="bg-[#35c6ff] relative w-full flex flex-col items-center px-4 lg:px-[60px] pb-20 pt-10 overflow-hidden">
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mt-10">
        <Frame29 />
        <Frame34 />
      </div>

      <div className="w-full max-w-[1440px] mt-16 relative aspect-[1440/1005]">
        <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={img202606091908241} />
      </div>

      <div className="w-full max-w-[1320px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">
        <Frame30 />
        <Frame31 />
        <Frame32 />
        <Frame33 />
      </div>
    </div>
  );
}

function Frame40() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Continuous Live Backup</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full">Automatically safeguard specific directories to ensure an always up-to-date version of your data lives securely in the cloud. Never fear accidental deletions again.</p>
    </div>
  );
}

function Frame41() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Set up continuous, background live backups for your most important directories.</p>
    </div>
  );
}

function Frame42() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Guarantee a perfectly fresh version of your data is always mirrored in the cloud.</p>
    </div>
  );
}

function Frame43() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Unlimited version history. We save every iteration of your files because storage is infinite.</p>
    </div>
  );
}

function Frame44() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Effortlessly roll back changes, restore previous versions, or recover deleted items.</p>
    </div>
  );
}

function ArrowRightCircle4() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[15px] text-white whitespace-nowrap">Mirroring Manager Guide</p>
      <ArrowRightCircle4 />
    </div>
  );
}

function Frame46() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame47 />
    </div>
  );
}

function ArrowRightCircle5() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">FAQ</p>
      <ArrowRightCircle5 />
    </div>
  );
}

function Frame48() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame49 />
    </div>
  );
}

function Frame45() {
  return (
    <div className="flex flex-col sm:flex-row lg:flex-row gap-[24px] items-start justify-center w-full lg:w-auto pt-[50px] lg:pt-0">
      <Frame46 />
      <Frame48 />
    </div>
  );
}

function Frame39() {
  return (
    <div className="bg-gradient-to-b from-[#35c6ff] to-[#004eff] relative w-full flex flex-col items-center px-4 lg:px-[60px] pb-20 pt-10 overflow-hidden">
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mt-10">
        <Frame40 />
        <Frame45 />
      </div>

      <div className="w-full max-w-[1440px] mt-16 relative aspect-[1440/1005]">
        <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={img202606091915481} />
      </div>

      <div className="w-full max-w-[1320px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">
        <Frame41 />
        <Frame42 />
        <Frame43 />
        <Frame44 />
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Deep System Integration</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full">You don't even need to open the app. Connect your Telegram cloud as a virtual drive directly into your operating system for ultimate convenience.</p>
    </div>
  );
}

function Frame52() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Flawless integration with your OS's native file explorer (Finder, Explorer).</p>
    </div>
  );
}

function Frame53() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Unlock a local folder with genuinely infinite capacity that scales as you need it.</p>
    </div>
  );
}

function Frame54() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Zero learning curve. Manage your cloud data exactly as you would any local file.</p>
    </div>
  );
}

function Frame55() {
  return (
    <div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">
      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">Pin shortcuts anywhere on your system for instantaneous access to your cloud.</p>
    </div>
  );
}

function ArrowRightCircle6() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[15px] text-white whitespace-nowrap">Integration Guide</p>
      <ArrowRightCircle6 />
    </div>
  );
}

function Frame57() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame58 />
    </div>
  );
}

function ArrowRightCircle7() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_265)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_265">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">FAQ</p>
      <ArrowRightCircle7 />
    </div>
  );
}

function Frame59() {
  return (
    <div className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all">
      <Frame60 />
    </div>
  );
}

function Frame56() {
  return (
    <div className="flex flex-col sm:flex-row lg:flex-row gap-[24px] items-start justify-center w-full lg:w-auto pt-[50px] lg:pt-0">
      <Frame57 />
      <Frame59 />
    </div>
  );
}

function Frame50() {
  return (
    <div className="bg-gradient-to-b from-[#004eff] to-[#09090b] relative w-full flex flex-col items-center px-4 lg:px-[60px] pb-20 pt-10 overflow-hidden">
      <div className="w-full max-w-[1320px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mt-10">
        <Frame51 />
        <Frame56 />
      </div>

      <div className="w-full max-w-[1440px] mt-16 relative aspect-[1440/1005]">
        <img alt="" className="absolute inset-0 size-full object-cover rounded-[10px]" src={img202606091924471} />
      </div>

      <div className="w-full max-w-[1320px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">
        <Frame52 />
        <Frame53 />
        <Frame54 />
        <Frame55 />
      </div>
    </div>
  );
}

function Frame62() {
  return (
    <div className="flex flex-col gap-[24px] items-center text-center text-white w-full max-w-[800px] mx-auto shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">How to start using?</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full">Since this project is my personal hobby, it doesn't have Apple and Windows certificates, which requires a few simple installation steps.</p>
    </div>
  );
}

function ArrowRightCircle8() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_291)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_291">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[#09090b] text-[15px] whitespace-nowrap">Installation Guide</p>
      <ArrowRightCircle8 />
    </div>
  );
}

function Frame64() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all">
      <Frame65 />
    </div>
  );
}

function Frame63() {
  return (
    <div className="absolute content-stretch flex flex-col items-start justify-center left-[calc(62.5%-2px)] top-[114px]">
      <Frame64 />
    </div>
  );
}

function ArrowRightCircle9() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_291)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_291">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[#09090b] text-[15px] whitespace-nowrap">FAQ</p>
      <ArrowRightCircle9 />
    </div>
  );
}

function Frame67() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all">
      <Frame68 />
    </div>
  );
}

function Frame66() {
  return (
    <div className="absolute content-stretch flex flex-col items-start justify-center left-[calc(62.5%-2px)] top-[178px]">
      <Frame67 />
    </div>
  );
}

function ArrowRightCircle10() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="arrow-right-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_291)" id="arrow-right-circle">
          <path d={svgPaths.p14d24500} id="Vector" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p414e5c0} id="Vector_2" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6.66667 10H13.3333" id="Vector_3" stroke="#09090b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_291">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex gap-[6px] items-center justify-center relative shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] text-[#09090b] text-[15px] whitespace-nowrap">Download</p>
      <ArrowRightCircle10 />
    </div>
  );
}

function Frame69() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] rounded-[5px] w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all">
      <Frame70 />
    </div>
  );
}

function Frame61() {
  return (
    <div className="bg-[#09090b] relative w-full flex flex-col items-center py-[100px] gap-10 px-4">
      <Frame62 />
      <div className="flex flex-col sm:flex-row gap-[24px] items-center justify-center">
        <Frame64 />
        <Frame67 />
        <Frame69 />
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <div className="col-1 h-[100.211px] ml-[19.86px] mt-0 relative row-1 w-[93.27px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
      </div>
      <p className="[word-break:break-word] col-1 font-['Montserrat:Black',sans-serif] font-black leading-[normal] ml-0 mt-[100.21px] relative row-1 text-[24px] md:text-[30px] text-white whitespace-nowrap">FOLDED</p>
    </div>
  );
}

export function Frame71() {
  return (
    <footer className="bg-[#09090b] border-t border-white/5 relative w-full flex flex-col items-center py-[60px] md:py-[100px] px-4 z-20">
      <div className="flex flex-col gap-[60px] md:gap-[100px] items-center justify-center w-full max-w-[1440px]">
        
        <div className="flex flex-col gap-[30px] items-center justify-center w-full">
          <Group1 />
          <p className="font-['Montserrat:Light',sans-serif] font-light text-[16px] text-center text-white/60 max-w-[90%] md:max-w-md w-full">
            Truly unlimited, convenient personal storage directly from your Telegram account. Designed for privacy and infinite scalability.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-[12px] sm:gap-[24px] items-center justify-center w-full sm:w-auto">
          <Frame3 />
          <Frame4 />
          <Frame5 />
          <Frame6 />
          <Frame7 />
          <Frame8 />
        </div>

      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="content-stretch flex flex-col items-center relative size-full">
      <Frame />
      <Frame9 />
      <Frame15 />
      <Frame28 />
      <Frame39 />
      <Frame50 />
      <Frame61 />
      <Frame71 />
    </div>
  );
}