# AsselSearch

A web search MCP server powered by Exa.

## Requirements

- Node.js 22.19 or later
- An Exa API key

## Setup

Install dependencies:

```powershell
npm install
```

Create a `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Open `.env` and add your Exa API key:

```text
EXA_API_KEY=ضع_مفتاحك_هنا
```

Keep `.env` private. Do not publish it or share your API key.

## Build

```powershell
npm run build
```

## Test with MCP Inspector

```powershell
npx @modelcontextprotocol/inspector node --env-file=.env dist/index.js
```

In Inspector, open **Tools** and run `search_web`.

## Search options

- `query`: Search text, 2–500 characters.
- `maxResults`: Number of results, from 1 to 10. Defaults to 5.
- `includeDomains`: Optional domains to search.
- `excludeDomains`: Optional domains to skip.

Results include source titles, URLs, and excerpts. Publication dates appear when Exa provides them.