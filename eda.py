import json
import re

def parse_vehicle_text(text):
    lines = text.split('\n')
    result = {
        "company": lines[0].strip(),
        "model": lines[1].strip() if len(lines) > 1 else "",
        "승차인원": None,
        "최고속도출력": None,
        "1회충전주행거리_상온": None,
        "1회충전주행거리_저온": None,
        "배터리": None,
        "국고보조금": None,
        "판매사연락처": None,
        "제조사": None,
        "제조국가": None
    }
    for line in lines[2:]:
        if "승차인원" in line:
            result["승차인원"] = re.search(r'승차인원:(.*)', line).group(1).strip()
        elif "최고속도출력" in line:
            result["최고속도출력"] = re.search(r'최고속도출력:(.*)', line).group(1).strip()
        elif "1회충전주행거리" in line:
            m = re.search(r'1회충전주행거리 :\(상온\) ([^ ]+)km \(저온\) ([^ ]+)km', line)
            if m:
                result["1회충전주행거리_상온"] = m.group(1)
                result["1회충전주행거리_저온"] = m.group(2)
        elif "배터리" in line:
            result["배터리"] = re.search(r'배터리 :(.*)', line).group(1).strip()
        elif "국고보조금" in line:
            result["국고보조금"] = re.search(r'국고보조금 :(.*)', line).group(1).strip()
        elif "판매사연락처" in line:
            result["판매사연락처"] = re.search(r'판매사연락처 :(.*)', line).group(1).strip()
        elif "제조사" in line:
            result["제조사"] = re.search(r'제조사 :(.*)', line).group(1).strip()
        elif "제조국가" in line:
            result["제조국가"] = re.search(r'제조국가 :(.*)', line).group(1).strip()
    return result

if __name__ == "__main__":
    with open("all_subpage_infos.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    parsed = []
    for entry in data:
        for info in entry["infos"]:
            parsed.append(parse_vehicle_text(info["text"]))
    with open("parsed_vehicle_infos.json", "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)