"use client";

export default function VaultError() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-tertiary)]">
      <p className="text-sm">Vault를 불러올 수 없습니다</p>
      <p className="text-xs">Obsidian vault 경로 또는 API 연결을 확인하세요</p>
    </div>
  );
}
