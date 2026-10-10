import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod/v4';

const exaResponseSchema = z.object({
  requestId: z.string().optional(),
  results: z.array(
    z.object({
      title: z.string().nullish(),
      url: z.string().url(),
      publishedDate: z.string().nullish(),
      highlights: z.array(z.string()).optional(),
      summary: z.string().nullish(),
    }),
  ),
});

function textResult(text: string, isError = false) {
  return {
    isError,
    content: [{ type: 'text' as const, text }],
  };
}

function createServer() {
  const server = new McpServer({
    name: 'assel-search',
    version: '0.1.0',
  });

  server.registerTool(
    'search_web',
    {
      title: 'Search the web',
      description:
        'Search the web with Exa. Returns source titles, URLs, publication dates when available, and excerpts.',
      inputSchema: {
        query: z.string().trim().min(2).max(500)
          .describe('What to search for.'),
        maxResults: z.number().int().min(1).max(10).default(5)
          .describe('Number of results to return, from 1 to 10.'),
        includeDomains: z.array(z.string().trim().min(1)).max(10).optional()
          .describe('Only include results from these domains.'),
        excludeDomains: z.array(z.string().trim().min(1)).max(10).optional()
          .describe('Exclude results from these domains.'),
      },
    },
    async ({ query, maxResults, includeDomains, excludeDomains }) => {
      const apiKey = process.env.EXA_API_KEY;

      if (!apiKey) {
        return textResult(
          'EXA_API_KEY is missing. Set it in the environment before starting the server.',
          true,
        );
      }

      try {
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            query,
            type: 'auto',
            numResults: maxResults,
            includeDomains,
            excludeDomains,
            contents: { highlights: true },
          }),
          signal: AbortSignal.timeout(20_000),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return textResult(
              `Exa rejected the API key (HTTP ${response.status}). Check the key in your local environment.`,
              true,
            );
          }

          if (response.status === 429) {
            return textResult(
              'Exa rate limit reached. Wait a little, then try again.',
              true,
            );
          }

          return textResult(`Exa returned HTTP ${response.status}.`, true);
        }

        const payload: unknown = await response.json();
        const parsed = exaResponseSchema.safeParse(payload);

        if (!parsed.success) {
          return textResult(
            'Exa returned an unexpected response format.',
            true,
          );
        }

        const results = parsed.data.results;

        if (results.length === 0) {
          return textResult(`No results found for: ${query}`);
        }

        const formattedResults = results.map((result, index) => {
          const excerpt =
            result.highlights?.join(' ') ||
            result.summary ||
            'No excerpt was returned.';

          return [
            `${index + 1}. ${result.title ?? 'Untitled'}`,
            `URL: ${result.url}`,
            ...(result.publishedDate
            ? [`Published: ${result.publishedDate}`]
            : []),            `Excerpt: ${excerpt.slice(0, 700)}`,
          ].join('\n');
        });

        return textResult(
          `Found ${results.length} result(s) for: ${query}\n\n${formattedResults.join('\n\n')}`,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Unknown network error.';
        return textResult(`Exa search failed: ${reason}`, true);
      }
    },
  );

  return server;
}

serveStdio(createServer);
console.error('AsselSearch MCP server started.');