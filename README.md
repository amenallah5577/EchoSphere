# EchoSphere

EchoSphere is an AI research workspace for turning web searches and uploaded PDFs into structured analysis reports. It combines live web discovery, deep page scraping, Groq-powered response generation, MongoDB-backed history, and a protected admin view.

## Screenshots

![EchoSphere workspace](docs/screenshots/workspace.png)

![AI research report](docs/screenshots/research-report.png)

![History drawer](docs/screenshots/history-drawer.png)

## Features

- AI research reports generated from live Tavily search results and Groq chat completions.
- Deep scraping for top web results with private-network URL safeguards.
- PDF upload support with in-memory parsing.
- Shared research history stored in MongoDB.
- Basic-auth protected admin history dashboard.
- Dark and light theme support with responsive layout.

## Tech Stack

- Node.js and Express
- MongoDB with Mongoose
- Groq SDK
- Tavily Search API
- Multer and pdf-parse for PDF uploads
- Vanilla HTML, CSS, and JavaScript

## Getting Started

```bash
git clone https://github.com/amenallah5577/EchoSphere.git
cd EchoSphere
npm install
cp .env.example .env
npm run check
npm start
```

The app runs at `http://localhost:3000` by default.

## Environment Variables

Copy `.env.example` to `.env`, then fill in:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string for saved report history. |
| `GROQ_API_KEY` | Groq API key for report generation. |
| `TAVILY_API_KEY` | Tavily API key for live web search. |
| `ADMIN_USERNAME` | Username for the admin history dashboard. |
| `ADMIN_PASSWORD` | Password for the admin history dashboard. |

## API Overview

| Route | Method | Description |
| --- | --- | --- |
| `/api/dispatch` | `POST` | Runs a research task, optionally with an uploaded PDF. |
| `/api/history` | `GET` | Returns recent shared research history. |
| `/api/admin/history` | `GET` | Returns recent research history for the admin dashboard. Requires basic auth. |
| `/admin.html` | `GET` | Protected admin dashboard for reviewing saved reports. |

## Quality Checks

```bash
npm run check
npm audit
```

`npm run check` validates the server syntax. `npm audit` is useful before releases because upstream provider SDK advisories can change over time.

## Project Structure

```text
.
|-- public/
|   |-- admin.html
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- docs/
|   `-- screenshots/
|-- server.js
|-- package.json
`-- .env.example
```
