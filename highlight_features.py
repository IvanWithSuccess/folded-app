import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# The pattern is exactly:
# function FrameXX() {
#   return (
#     <div className="flex flex-col items-start w-full">
#       <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] text-white tracking-[0.64px] w-full">...</p>
#     </div>
#   );
# }

# We'll use regex to find these specific blocks and replace the wrapper.

pattern = re.compile(
    r'(<div className="flex flex-col items-start w-full">)\s*(<p className="font-\[\'Montserrat:Regular\',sans-serif\] font-normal leading-\[22px\] text-\[16px\] text-white tracking-\[0\.64px\] w-full">.*?</p>)\s*(</div>)'
)

def replacer(match):
    div_start = '<div className="flex flex-row items-start w-full gap-3 sm:gap-0 bg-white/5 sm:bg-transparent p-4 sm:p-0 rounded-[10px] sm:rounded-none border border-white/10 sm:border-transparent">'
    bullet = '      <div className="w-1.5 h-1.5 rounded-full bg-[#35c6ff] mt-2 shrink-0 sm:hidden" />'
    p_tag = match.group(2)
    div_end = match.group(3)
    
    return f"{div_start}\n{bullet}\n      {p_tag}\n    {div_end}"

new_content = pattern.sub(replacer, content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Done")
