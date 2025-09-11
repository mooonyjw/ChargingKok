from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import json

URL = "https://ev.or.kr/nportal/buySupprt/initSubsidyTargetVehicleAction.do"

def setup_driver():
    opts = Options()
    opts.add_experimental_option("detach", True)
    opts.add_argument("--window-size=1400,1000")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    return driver

def main():
    driver = setup_driver()
    driver.get(URL)

    # 페이지 로드 대기
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    print("✅ 페이지 열림")

    # 모든 정보를 담을 리스트
    all_results = []

    # label[1] ~ label[4] 순회
    for i in range(1, 5):
        label_xpath = f'//*[@id="searchForm"]/div/table/tbody/tr[2]/td/label[{i}]'
        label_elem = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, label_xpath))
        )
        driver.execute_script("arguments[0].click();", label_elem)
        print(f"✅ label[{i}] 선택 완료")
        time.sleep(1)

        # 회사 셀렉트 박스 option들 순회
        select_elem = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//*[@id="schCompany"]'))
        )
        options = select_elem.find_elements(By.TAG_NAME, "option")
        for idx, option in enumerate(options):
            option_value = option.get_attribute("value")
            if not option_value:
                continue  # value 없는 option은 skip
            driver.execute_script("arguments[0].selected = true;", option)
            option.click()
            print(f"  ✅ 회사 option[{idx}] ({option.text}) 선택 완료")
            time.sleep(1)

            # 조회 버튼 클릭
            search_btn_xpath = '//*[@id="searchForm"]/div/table/tbody/tr[5]/td/button'
            search_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, search_btn_xpath))
            )
            driver.execute_script("arguments[0].click();", search_btn)
            print("    ✅ 조회 버튼 클릭")
            time.sleep(2)

            # 페이지네이션 처리: 번호가 있는 동안 반복
            page_num = 1
            while True:
                # subPage의 div[n]/a가 없을 때까지 모든 정보 저장
                subpage_infos = []
                n = 1
                while True:
                    info_xpath = f'//*[@id="subPage"]/div/div/div[1]/div[{n}]/a'
                    try:
                        info_elem = driver.find_element(By.XPATH, info_xpath)
                    except Exception:
                        break
                    info_text = info_elem.text
                    info_href = info_elem.get_attribute("href")
                    subpage_infos.append({"text": info_text, "href": info_href})
                    print(f"      ✅ subPage div[{n}] 정보 저장: {info_text}")
                    n += 1
                # label, option, page 정보를 함께 저장
                all_results.append({
                    "label": i,
                    "option_idx": idx,
                    "option_text": option.text,
                    "page": page_num,
                    "infos": subpage_infos
                })
                # 다음 페이지 버튼 찾기
                next_page_xpath = f'//*[@id="{page_num+1}"]'
                try:
                    next_btn = driver.find_element(By.XPATH, next_page_xpath)
                    next_btn.click()
                    print(f"      ✅ 페이지 {page_num+1} 이동")
                    time.sleep(2)
                    page_num += 1
                except Exception:
                    break  # 다음 페이지 없으면 종료

    # 모든 결과를 하나의 json 파일로 저장
    json_filename = "all_subpage_infos.json"
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"✅ 전체 결과 {json_filename} 저장 완료")

if __name__ == "__main__":
    main()