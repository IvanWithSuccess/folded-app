import json

log_path = "/Users/ivan/.gemini/antigravity/brain/85c04ddc-e2e2-4dda-b6cf-48d196841146/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        content = data.get("content", "")
        if "function Frame1() {" in content and "function Frame2() {" in content:
            # We found the file content or diff
            start = content.find("function Frame1() {")
            end = content.find("function Frame3() {")
            print(content[start:end])
            break
