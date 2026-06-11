import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

frames_code = """
function Frame10() {
  return (
    <div className="flex flex-col gap-[25px] items-center text-center text-white w-full max-w-[1320px] px-4 mx-auto">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">What is Folded?</p>
      <p className="font-['Montserrat:Light',sans-serif] font-light text-[16px] w-full">Folded is an unofficial Telegram client that turns your account into a cloud drive.</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">The Problem</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        Telegram offers unlimited cloud storage in your "Saved Messages".{"\\n"}
        However, organizing thousands of files within a chat interface is chaotic and inefficient.
      </p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">The Solution</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        Folded brings a native file explorer experience to your Telegram storage.{"\\n"}
        Manage your files intuitively with folders, drag-and-drop, and grid layouts.
      </p>
    </div>
  );
}

function Frame14() {
  return (
    <div className="flex flex-col gap-[24px] items-start text-white w-full lg:w-[433px] shrink-0">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] w-full">Unlimited & Free</p>
      <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] w-full whitespace-pre-wrap">
        Since Folded operates directly on top of Telegram's API, you get unlimited storage.{"\\n"}
        No subscription fees, no storage limits, perfectly integrated.
      </p>
    </div>
  );
}

"""

if "function Frame10(" not in content:
    content = content.replace("function Frame9() {", frames_code + "function Frame9() {")
    with open(file_path, "w") as f:
        f.write(content)
    print("Restored Frame10, 11, 12, 14")
else:
    print("Already there")
