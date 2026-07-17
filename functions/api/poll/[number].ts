type Env = { GITHUB_TOKEN?: string; GH_TOKEN?: string };

const OWNER = 'MLSysDev';
const NAME = 'mlsystems.dev';

const QUERY = `
query($owner:String!,$name:String!,$number:Int!){
  repository(owner:$owner,name:$name){
    discussion(number:$number){
      poll{ question totalVoteCount options(first:10){ nodes{ option totalVoteCount } } }
    }
  }
}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet(context: {
  params: { number: string };
  env: Env;
}): Promise<Response> {
  const number = Number(context.params.number);
  if (!Number.isInteger(number) || number <= 0) return json({ options: [] }, 400);

  const token = context.env.GITHUB_TOKEN || context.env.GH_TOKEN;
  if (!token) return json({ options: [] });

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
    if (!res.ok) return json({ options: [] });
    const data = (await res.json()) as {
      data?: {
        repository?: {
          discussion?: {
            poll?: {
              question: string;
              totalVoteCount: number;
              options: { nodes: { option: string; totalVoteCount: number }[] };
            } | null;
          } | null;
        };
      };
    };
    const poll = data.data?.repository?.discussion?.poll;
    if (!poll) return json({ options: [] });
    return json({
      question: poll.question,
      totalVoteCount: poll.totalVoteCount,
      options: poll.options.nodes.map((o) => ({ option: o.option, votes: o.totalVoteCount })),
    });
  } catch {
    return json({ options: [] });
  }
}
