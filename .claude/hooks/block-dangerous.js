#!/usr/bin/env node

/**
 * PreToolUse 훅: Bash 명령어 안전성 검사
 *
 * stdin으로 JSON을 받아 tool_input.command를 검사한다.
 * 위험 패턴이 발견되면 stderr에 이유를 출력하고 exit 2 (차단).
 * 안전하면 exit 0.
 */

const BLOCKED_PATTERNS = [
  // 파일 시스템 파괴
  { regex: /\brm\s+-(r|rf|fr)\s/, reason: '재귀 삭제 차단' },
  { regex: /\brm\s+--force/, reason: '강제 삭제 차단' },
  { regex: /\brm\s+-f\s+data\/vulcan\.db/, reason: 'DB 파일 삭제 차단' },
  // Git 파괴
  { regex: /\bgit\s+push\s+(-f|--force)/, reason: 'force push 차단' },
  { regex: /\bgit\s+reset\s+--hard/, reason: 'hard reset 차단' },
  { regex: /\bgit\s+clean\s+-f/, reason: 'git clean -f 차단' },
  // PM2 파괴 (사용자 확인 필요)
  { regex: /\bpm2\s+(restart|stop|delete)\b/, reason: 'PM2 프로세스 조작 차단 (사용자 확인 필요)' },
  // 권한 위험
  { regex: /\bchmod\s+777/, reason: 'chmod 777 차단' },
  // 원격 코드 실행
  { regex: /\bcurl\b.*\|\s*(sh|bash)/, reason: '원격 스크립트 실행 차단' },
  { regex: /\bwget\b.*\|\s*(sh|bash)/, reason: '원격 스크립트 실행 차단' },
  { regex: /\beval\s+/, reason: 'eval 차단' },
  // 환경 파일 직접 조작
  { regex: /\bcat\b.*\.env/, reason: '.env 직접 읽기 차단' },
  { regex: /\b(echo|printf)\b.*>.*\.env/, reason: '.env 직접 쓰기 차단' },
  // DB 파괴
  { regex: /\bDROP\s+(TABLE|DATABASE)\b/i, reason: 'DROP 명령 차단' },
  { regex: /\bTRUNCATE\b/i, reason: 'TRUNCATE 명령 차단' },
];

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0); // 파싱 실패 시 통과
  }

  const command = data?.tool_input?.command || '';
  if (!command) {
    process.exit(0);
  }

  for (const { regex, reason } of BLOCKED_PATTERNS) {
    if (regex.test(command)) {
      process.stderr.write(`[차단] ${reason}: ${command}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
