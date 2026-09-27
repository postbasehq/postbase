import { NextResponse } from "next/server";

/**
 * Total GitHub stars across the postbasehq org's public repos, for the star
 * count on the nav's GitHub button. Cached for an hour so we stay far under
 * GitHub's unauthenticated rate limit (GITHUB_TOKEN raises it if set).
 */
export const revalidate = 3600;

const ORG = "postbasehq";

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?type=public&per_page=100`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const repos = (await res.json()) as { stargazers_count?: number; fork?: boolean }[];
    const stars = repos.filter((r) => !r.fork).reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
    return NextResponse.json({ stars }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    // The button still works without a count.
    return NextResponse.json({ stars: null }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
