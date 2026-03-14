"use client";

import { useCallback, useMemo, useState } from "react";
import type { Agent, Skill, SkillRegistryEntry } from "@/lib/types";

const ICON_MAP: Record<string, string> = {
  code: "💻",
  search: "🔍",
  zap: "⚡",
  pen: "✏️",
  bot: "🤖",
};

function getIconEmoji(iconKey: string): string {
  return ICON_MAP[iconKey] ?? "⚡";
}

interface Props {
  initialSkills: Skill[];
  initialAgents: Agent[];
  initialRegistry: SkillRegistryEntry[];
}

export function SkillsMarketplace({ initialSkills, initialAgents }: Props) {
  const [skills, setSkills] = useState(initialSkills);
  const [agents] = useState(initialAgents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentSkillMap, setAgentSkillMap] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const agent of initialAgents) {
      map[agent.id] = agent.skills ?? [];
    }
    return map;
  });
  const [syncing, setSyncing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeAgents = useMemo(() => agents.filter((a) => a.isActive), [agents]);

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, searchQuery]);

  const selectedAgentSkills = useMemo(() => {
    if (!selectedAgentId) return [];
    return agentSkillMap[selectedAgentId] ?? [];
  }, [selectedAgentId, agentSkillMap]);

  const availableSkills = useMemo(() => {
    return filteredSkills.filter((s) => !selectedAgentSkills.includes(s.name));
  }, [filteredSkills, selectedAgentSkills]);

  const refreshSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills);
      }
    } catch { /* best-effort */ }
  }, []);

  function showError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  }

  async function handleSync() {
    setSyncing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/skills/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const newMap = { ...agentSkillMap };
        for (const item of data.synced) {
          newMap[item.agentId] = item.skills;
        }
        setAgentSkillMap(newMap);
        await refreshSkills();
      } else {
        showError(`동기화 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`동기화 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleInstall(agentId: string, skillName: string) {
    setActionInProgress(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName }),
      });
      if (res.ok) {
        setAgentSkillMap((prev) => ({
          ...prev,
          [agentId]: [...(prev[agentId] ?? []), skillName],
        }));
        await refreshSkills();
      } else {
        showError(`설치 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`설치 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleRemove(agentId: string, skillName: string) {
    setActionInProgress(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/skills/${encodeURIComponent(skillName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAgentSkillMap((prev) => ({
          ...prev,
          [agentId]: (prev[agentId] ?? []).filter((s) => s !== skillName),
        }));
        await refreshSkills();
      } else {
        showError(`제거 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`제거 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setActionInProgress(false);
    }
  }

  return (
    <section className="space-y-3">
      {errorMessage && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-2 text-sm text-[var(--color-destructive-text)]">
          {errorMessage}
        </div>
      )}

      {/* 헤더: 검색 + 동기화 + 에이전트 선택 */}
      <div className="vulcan-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">스킬 관리</h2>
          <button
            type="button"
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "동기화 중..." : "동기화"}
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="스킬 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="vulcan-input flex-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
          <select
            className="vulcan-input min-h-[44px] sm:w-48"
            value={selectedAgentId ?? ""}
            onChange={(e) => setSelectedAgentId(e.target.value || null)}
          >
            <option value="">에이전트 선택...</option>
            {activeAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 에이전트 선택 시: 설치된 스킬 */}
      {selectedAgentId && selectedAgentSkills.length > 0 && (
        <div className="vulcan-card p-4">
          <h3 className="mb-2 text-sm font-semibold">
            설치된 스킬 ({selectedAgentSkills.length})
          </h3>
          <div className="space-y-1">
            {selectedAgentSkills.map((skillName) => {
              const skill = skills.find((s) => s.name === skillName);
              return (
                <div
                  key={skillName}
                  className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span>{getIconEmoji(skill?.iconKey ?? "zap")}</span>
                    <span className="text-sm">{skill?.displayName ?? skillName}</span>
                  </div>
                  <button
                    type="button"
                    className="rounded-[var(--radius-control)] px-3 py-1.5 text-xs min-h-[44px] text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)] disabled:opacity-50"
                    onClick={() => handleRemove(selectedAgentId, skillName)}
                    disabled={actionInProgress}
                  >
                    제거
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 스킬 카탈로그 */}
      <div className="vulcan-card p-4">
        <h3 className="mb-2 text-sm font-semibold">
          {selectedAgentId ? "추가 가능한 스킬" : "전체 스킬"} ({selectedAgentId ? availableSkills.length : filteredSkills.length})
        </h3>
        <div className="space-y-1 overflow-y-auto lg:max-h-[calc(100vh-400px)]">
          {(selectedAgentId ? availableSkills : filteredSkills).length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              {skills.length === 0 ? "동기화를 클릭하여 스킬을 가져오세요" : "검색 결과 없음"}
            </p>
          )}
          {(selectedAgentId ? availableSkills : filteredSkills).map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base">{getIconEmoji(skill.iconKey)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{skill.displayName || skill.name}</p>
                  <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                    {skill.category} · {skill.name}
                  </p>
                </div>
              </div>
              {selectedAgentId && (
                <button
                  type="button"
                  className="shrink-0 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1.5 text-xs min-h-[44px] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  onClick={() => handleInstall(selectedAgentId, skill.name)}
                  disabled={actionInProgress}
                >
                  설치
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
