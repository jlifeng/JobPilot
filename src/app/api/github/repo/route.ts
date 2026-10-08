import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, '');

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
      }
      if (res.status === 403) {
        return NextResponse.json({ error: 'GitHub API rate limit exceeded' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Failed to fetch repository' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      name: data.full_name,
      stars: data.stargazers_count,
      description: data.description || '',
      url: data.html_url,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 500 });
  }
}
