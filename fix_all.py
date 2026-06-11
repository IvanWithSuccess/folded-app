import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace Frame2
frame2_bad = re.compile(r'export function Frame2\(\) \{.*?\n\}', re.DOTALL)
frame2_good = """export function Frame2() {
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
}"""
content = frame2_bad.sub(frame2_good, content)

# Replace Frame1
frame1_bad = re.compile(r'export function Frame1\(\) \{.*?\n\}', re.DOTALL)
frame1_good = """export function Frame1() {
  return (
    <div className="w-full flex flex-col gap-10 md:gap-[100px] items-center justify-center pt-[50px] md:h-[502px] z-10">
      <Frame13 />
      <Frame2 />
    </div>
  );
}"""
content = frame1_bad.sub(frame1_good, content)

# Replace Frame
frame_bad = re.compile(r'function Frame\(\) \{.*?\n\}', re.DOTALL)
frame_good = """function Frame() {
  return (
    <div className="bg-[#09090b] min-h-[1024px] h-auto overflow-hidden relative shrink-0 w-full flex flex-col items-center">
      <Frame1 />
      <div className="relative w-full max-w-[1206.327px] mt-10 md:mt-0 md:-mt-10 px-4 flex justify-center z-0" data-name="Снимок экрана 2026-04-29 в 21.43.11 1">
        <img alt="" className="w-full h-auto object-contain pointer-events-none" src={img202604292143111} />
      </div>
    </div>
  );
}"""
content = frame_bad.sub(frame_good, content)

# Remove the bad Frame10, 11, 12, 14 entirely to be safe and rewrite them cleanly
bad_frames = re.compile(r'function Frame10\(\) \{.*?function Frame9\(\) \{', re.DOTALL)

good_frames = """function Frame10() {
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

function Frame9() {"""

content = bad_frames.sub(good_frames, content)

with open(file_path, "w") as f:
    f.write(content)
print("FIXED")
