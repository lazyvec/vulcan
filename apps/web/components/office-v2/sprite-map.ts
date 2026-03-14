import type { Agent } from "@/lib/types";
import type { SpriteConfig } from "./types";
import { AGENT_SPRITES } from "./constants";

/** 에이전트 ID에서 이름 키 추출 (e.g., "hermes-main" → "hermes") */
function extractAgentKey(agent: Agent): string {
  const name = agent.name.toLowerCase();
  // 정확히 매칭하는 스프라이트 확인
  if (AGENT_SPRITES[name]) return name;
  // 접미사 제거하여 검색 (긴 키 우선 → 더 정확한 매칭)
  for (const key of Object.keys(AGENT_SPRITES).sort((a, b) => b.length - a.length)) {
    if (name.startsWith(key)) return key;
  }
  return name;
}

/** 에이전트에 대한 스프라이트 설정 반환. 미매칭 시 동적 생성 */
export function getSpriteConfig(agent: Agent): SpriteConfig {
  const key = extractAgentKey(agent);
  if (AGENT_SPRITES[key]) return AGENT_SPRITES[key];

  // 매칭 안 되면 이름 기반 색상 생성
  let hash = 0;
  for (let i = 0; i < agent.name.length; i++) {
    hash = ((hash << 5) - hash + agent.name.charCodeAt(i)) | 0;
  }
  const hue = ((hash >>> 0) % 360);

  return {
    agentId: agent.id,
    name: agent.name,
    spritePath: null,
    primaryColor: `hsl(${hue}, 60%, 55%)`,
    secondaryColor: `hsl(${hue}, 50%, 40%)`,
    roleTags: agent.roleTags ?? [],
  };
}
