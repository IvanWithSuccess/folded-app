import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Fix text-[30px] to text-[24px] md:text-[30px]
content = content.replace("text-[30px]", "text-[24px] md:text-[30px]")

# 2. Fix the black buttons (e.g., Frame24, Frame26, etc.) to have consistent width and hover effects
# These usually have `bg-[#09090b]` and `rounded-[5px]`.
# We'll just replace the specific classes.
# Note: Frame24 has `bg-[#09090b] relative rounded-[5px] shrink-0 w-full`
content = content.replace(
    'className="bg-[#09090b] relative rounded-[5px] shrink-0 w-full"',
    'className="bg-[#09090b] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-opacity-80 transition-all"'
)
content = content.replace(
    'className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0"',
    'className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all"'
)
content = content.replace(
    'className="bg-[#09090b] content-stretch flex items-center px-[20px] py-[10px] relative rounded-[5px] shrink-0"',
    'className="bg-[#09090b] content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:bg-[#1a1a1e] transition-all"'
)

# 3. Fix the white buttons in Frame61 section
content = content.replace(
    'className="bg-white content-stretch flex items-center px-[20px] py-[10px] relative rounded-[5px] shrink-0"',
    'className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all"'
)
content = content.replace(
    'className="bg-white content-stretch flex items-center px-[20px] py-[10px] rounded-[5px]"',
    'className="bg-white content-stretch flex items-center justify-center px-[20px] py-[10px] rounded-[5px] w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all"'
)

# 4. Fix Footer (Frame73, Frame74, Frame75-80)
# Frame73 text width
content = content.replace(
    'min-w-full relative shrink-0 text-[16px] text-center text-white w-[min-content]',
    'relative shrink-0 text-[16px] text-center text-white max-w-[90%] md:max-w-md w-full'
)

# Frame74 layout
content = content.replace(
    'className="content-stretch flex flex-wrap gap-[24px] items-center justify-center relative shrink-0"',
    'className="content-stretch grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-[12px] sm:gap-[24px] items-center justify-center relative shrink-0 w-full sm:w-auto"'
)

# Footer white button (Frame75)
content = content.replace(
    'className="bg-white content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0"',
    'className="bg-white content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all"'
)

# Footer transparent buttons (Frame76-80)
content = content.replace(
    'className="content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative shrink-0"',
    'className="content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all"'
)

with open(file_path, "w") as f:
    f.write(content)

print("Done")
