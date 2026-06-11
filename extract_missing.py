import json

log_path = "/Users/ivan/.gemini/antigravity/brain/85c04ddc-e2e2-4dda-b6cf-48d196841146/.system_generated/logs/transcript.jsonl"
with open(log_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        content = data.get("content", "")
        # Look for the original index.tsx file dump
        if "function Frame1() {" in content and "function Frame10() {" in content and "function Frame9() {" in content:
            start = content.find("function Frame1() {")
            end = content.find("function Frame9() {")
            if start != -1 and end != -1 and end > start:
                with open("missing_block.tsx", "w") as out:
                    out.write(content[start:end])
                print("Extracted missing block")
                break
