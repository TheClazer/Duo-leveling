export type GithubStats = {
  contributions_year: number;
  current_streak: number;
  pinned_repos: Array<{ name: string; description: string | null; stars: number; forks: number; url: string }>;
  calendar: Record<string, number>;
};

const ENDPOINT = "https://api.github.com/graphql";

const QUERY = `
  query userStats($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount }
          }
        }
      }
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes {
          ... on Repository {
            name
            description
            stargazerCount
            forkCount
            url
          }
        }
      }
    }
  }
`;

export async function fetchGithubStats(username: string, token: string): Promise<GithubStats> {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "DuoLeveling/1.0",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { login: username, from: from.toISOString(), to: now.toISOString() },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json() as {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions: number;
            weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>;
          };
        };
        pinnedItems?: { nodes: Array<{ name: string; description: string | null; stargazerCount: number; forkCount: number; url: string }> };
      };
    };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  const u = json.data?.user;
  if (!u) throw new Error(`GitHub user "${username}" not found`);

  const cal = u.contributionsCollection?.contributionCalendar;
  const days = cal?.weeks.flatMap((w) => w.contributionDays) ?? [];
  const calendar: Record<string, number> = {};
  for (const d of days) calendar[d.date] = d.contributionCount;

  // current streak: consecutive days ending today with count > 0
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const key = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    if ((calendar[key] ?? 0) > 0) streak++;
    else break;
  }

  return {
    contributions_year: cal?.totalContributions ?? 0,
    current_streak: streak,
    pinned_repos: (u.pinnedItems?.nodes ?? []).map((r) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazerCount,
      forks: r.forkCount,
      url: r.url,
    })),
    calendar,
  };
}
