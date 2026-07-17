// Read-only proxy: returns a discussion's latest comments so a thread page can
// refresh past its build-time snapshot. Holds the token server-side. Degrades to
// an empty payload (the page keeps its baked-in comments) on any failure.

type Env = { GITHUB_TOKEN?: string; GH_TOKEN?: string };

const OWNER = 'MLSysDev';
const NAME = 'mlsystems.dev';
const CAP = 50;

const QUERY = `
query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    discussion(number:$number){
      comments(first:${CAP}){
        totalCount
        nodes{
          bodyHTML createdAt isAnswer
          author{ login url }
          replies(first:20){ nodes{ bodyHTML createdAt author{ login url } } }
        }
      }
    }
  }
}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Short edge cache smooths bursts without masking new replies for long.
      'cache-control': 'public, max-age=60',
    },
  });
}

export async function onRequestGet(context: {
  params: { number: string };
  env: Env;
}): Promise<Response> {
  const number = Number(context.params.number);
  if (!Number.isInteger(number) || number <= 0) return json({ comments: [] }, 400);

  const token = context.env.GITHUB_TOKEN || context.env.GH_TOKEN;
  if (!token) return json({ comments: [] });

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'mlsystems-forum',
      },
      body: JSON.stringify({ query: QUERY, variables: { owner: OWNER, name: NAME, number } }),
    });
    if (!res.ok) return json({ comments: [] });
    const data = (await res.json()) as {
      data?: {
        repository?: {
          discussion?: {
            comments: {
              totalCount: number;
              nodes: Array<{
                bodyHTML: string;
                createdAt: string;
                isAnswer: boolean;
                author: { login: string; url: string } | null;
                replies: { nodes: Array<Record<string, unknown>> };
              }>;
            };
          } | null;
        };
      };
    };
    const c = data.data?.repository?.discussion?.comments;
    if (!c) return json({ comments: [] });
    const comments = c.nodes.map((n) => ({
      author: n.author,
      bodyHTML: n.bodyHTML,
      createdAt: n.createdAt,
      isAnswer: n.isAnswer,
      replies: n.replies.nodes,
    }));
    return json({ commentCount: c.totalCount, comments });
  } catch {
    return json({ comments: [] });
  }
}
