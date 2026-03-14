#!/usr/bin/env python3
"""
10개 판테온 에이전트 32x32 픽셀아트 스프라이트 생성기.
Pillow로 프로그래매틱 생성 (Gemini API 유료 플랜 불필요).
에이전트별 고유 색상 + 특징적 실루엣.
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "sprites" / "agents"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 에이전트별 색상 + 패턴 정의
AGENTS = {
    "hermes": {
        "primary": (224, 176, 60),     # 금색
        "secondary": (180, 140, 40),
        "accent": (255, 230, 140),
        "feature": "wings",            # 날개 달린 모자
    },
    "aegis": {
        "primary": (60, 120, 200),     # 파란색
        "secondary": (40, 80, 160),
        "accent": (180, 200, 230),
        "feature": "shield",           # 방패
    },
    "metis": {
        "primary": (140, 80, 200),     # 보라색
        "secondary": (100, 50, 160),
        "accent": (200, 170, 240),
        "feature": "glasses",          # 안경
    },
    "athena": {
        "primary": (160, 160, 160),    # 회색
        "secondary": (120, 120, 120),
        "accent": (220, 200, 140),
        "feature": "helmet",           # 투구
    },
    "themis": {
        "primary": (230, 230, 230),    # 흰색
        "secondary": (190, 190, 190),
        "accent": (240, 220, 170),
        "feature": "scales",           # 저울
    },
    "iris": {
        "primary": (220, 100, 160),    # 분홍/다채로운
        "secondary": (100, 180, 220),
        "accent": (255, 200, 100),
        "feature": "rainbow",          # 무지개
    },
    "daedalus": {
        "primary": (180, 120, 60),     # 구리색
        "secondary": (140, 90, 40),
        "accent": (220, 180, 120),
        "feature": "hammer",           # 망치
    },
    "nike": {
        "primary": (80, 180, 80),      # 녹색
        "secondary": (50, 140, 50),
        "accent": (200, 230, 140),
        "feature": "laurel",           # 월계관
    },
    "calliope": {
        "primary": (220, 140, 180),    # 분홍색
        "secondary": (180, 100, 140),
        "accent": (250, 200, 220),
        "feature": "scroll",           # 두루마리
    },
    "argus": {
        "primary": (160, 180, 200),    # 은색
        "secondary": (100, 120, 160),
        "accent": (200, 220, 240),
        "feature": "eyes",             # 여러 눈
    },
}

# 기본 캐릭터 바디 템플릿 (8x8 그리드 기준, 32x32에 4배 스케일)
# 0=투명, 1=primary, 2=secondary, 3=accent, 4=skin, 5=outline
BASE_BODY = [
    [0, 0, 5, 5, 5, 5, 0, 0],  # 머리 윗부분
    [0, 5, 1, 1, 1, 1, 5, 0],  # 머리
    [0, 5, 4, 3, 3, 4, 5, 0],  # 얼굴 (눈)
    [0, 0, 5, 4, 4, 5, 0, 0],  # 얼굴 아래
    [0, 5, 1, 1, 1, 1, 5, 0],  # 몸통 상단
    [5, 2, 1, 1, 1, 1, 2, 5],  # 몸통 (팔 포함)
    [0, 0, 2, 1, 1, 2, 0, 0],  # 다리 상단
    [0, 0, 5, 0, 0, 5, 0, 0],  # 발
]

# 에이전트별 특수 패턴 오버라이드
FEATURE_OVERRIDES = {
    "wings": {
        # 머리 양옆에 날개
        (0, 0): 3, (7, 0): 3,
        (0, 1): 3, (7, 1): 3,
    },
    "shield": {
        # 왼쪽에 방패
        (0, 4): 3, (0, 5): 3, (0, 6): 3,
    },
    "glasses": {
        # 안경 강조 (눈 줄 변경)
        (2, 2): 5, (5, 2): 5,
    },
    "helmet": {
        # 투구 꼭대기
        (3, 0): 3, (4, 0): 3,
        (2, 0): 2, (5, 0): 2,
    },
    "scales": {
        # 오른쪽에 저울
        (7, 3): 3, (7, 4): 3, (7, 5): 3,
    },
    "rainbow": {
        # 무지개 효과 (여러 색 적용은 draw_sprite에서 처리)
        (0, 0): 3, (7, 0): 3,
        (0, 7): 3, (7, 7): 3,
    },
    "hammer": {
        # 오른쪽에 망치
        (7, 4): 3, (7, 5): 3, (6, 4): 3,
    },
    "laurel": {
        # 머리에 월계관
        (1, 0): 3, (6, 0): 3,
        (2, 0): 3, (5, 0): 3,
    },
    "scroll": {
        # 왼쪽에 두루마리
        (0, 5): 3, (0, 6): 3, (1, 6): 3,
    },
    "eyes": {
        # 추가 눈 (몸통에)
        (3, 4): 3, (4, 4): 3,
        (2, 5): 3, (5, 5): 3,
    },
}

SKIN_COLOR = (220, 190, 160)
OUTLINE_COLOR = (40, 40, 50)
RAINBOW_COLORS = [
    (255, 80, 80), (255, 180, 60), (255, 255, 80),
    (80, 220, 80), (80, 160, 255), (160, 80, 220),
]


def draw_sprite(name: str, config: dict) -> Image.Image:
    """에이전트 스프라이트 32x32 PNG 생성"""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    primary = config["primary"]
    secondary = config["secondary"]
    accent = config["accent"]
    feature = config["feature"]

    color_map = {
        0: None,       # 투명
        1: primary,
        2: secondary,
        3: accent,
        4: SKIN_COLOR,
        5: OUTLINE_COLOR,
    }

    overrides = FEATURE_OVERRIDES.get(feature, {})

    for y in range(8):
        for x in range(8):
            # 특수 패턴 오버라이드 확인
            if (x, y) in overrides:
                val = overrides[(x, y)]
            else:
                val = BASE_BODY[y][x]

            if val == 0:
                continue

            color = color_map.get(val)
            if color is None:
                continue

            # Iris는 무지개 효과: primary 부분을 행별로 다른 색
            if name == "iris" and val == 1:
                color = RAINBOW_COLORS[y % len(RAINBOW_COLORS)]

            # 4배 스케일 (8x8 → 32x32)
            px, py = x * 4, y * 4
            draw.rectangle([px, py, px + 3, py + 3], fill=(*color, 255))

    return img


def main():
    print(f"🎨 10개 에이전트 프로그래매틱 스프라이트 생성")
    print(f"   출력 디렉토리: {OUTPUT_DIR}\n")

    for name, config in AGENTS.items():
        output_path = OUTPUT_DIR / f"{name}.png"
        img = draw_sprite(name, config)
        img.save(output_path, "PNG")
        print(f"  ✅ {name}: 저장 완료 ({output_path})")

    print(f"\n📊 결과: {len(AGENTS)}/{len(AGENTS)} 성공")


if __name__ == "__main__":
    main()
