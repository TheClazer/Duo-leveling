export type LeetcodeStats = {
  total_solved: number;
  easy: number;
  medium: number;
  hard: number;
  ranking: number | null;
  current_streak: number;
  calendar: Record<string, number>;
};

const ENDPOINT = "https://leetcode.com/graphql";

const QUERY = `
  query userPublicProfile($username: String!, $year: Int) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStats {
        acSubmissionNum { difficulty count }
      }
      userCalendar(year: $year) {
        submissionCalendar
        streak
      }
    }
  }
`;

export async function fetchLeetcodeStats(username: string): Promise<LeetcodeStats> {
  const year = new Date().getFullYear();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      "User-Agent": "Mozilla/5.0 (DuoLeveling/1.0)",
    },
    body: JSON.stringify({ query: QUERY, variables: { username, year } }),
    // No cache — we want fresh stats each sync
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LeetCode API ${res.status}`);
  const json = await res.json() as {
    data?: {
      matchedUser?: {
        profile?: { ranking?: number };
        submitStats?: { acSubmissionNum: Array<{ difficulty: "All" | "Easy" | "Medium" | "Hard"; count: number }> };
        userCalendar?: { submissionCalendar: string; streak: number };
      };
    };
    errors?: Array<{ message: string }>;
  };
  const u = json.data?.matchedUser;
  if (!u) throw new Error(json.errors?.[0]?.message ?? `LeetCode user "${username}" not found`);

  const stats = u.submitStats?.acSubmissionNum ?? [];
  const find = (d: string) => stats.find((s) => s.difficulty === d)?.count ?? 0;

  // submissionCalendar is a JSON string of {unix_ts: count}. Convert to {yyyy-mm-dd: count}.
  let calendar: Record<string, number> = {};
  try {
    const raw = JSON.parse(u.userCalendar?.submissionCalendar ?? "{}") as Record<string, number>;
    for (const [ts, count] of Object.entries(raw)) {
      const d = new Date(Number(ts) * 1000);
      const key = d.toISOString().slice(0, 10);
      calendar[key] = (calendar[key] ?? 0) + count;
    }
  } catch { calendar = {}; }

  return {
    total_solved: find("All"),
    easy: find("Easy"),
    medium: find("Medium"),
    hard: find("Hard"),
    ranking: u.profile?.ranking ?? null,
    current_streak: u.userCalendar?.streak ?? 0,
    calendar,
  };
}
