
# CSV Analytics Studio — Codex Instructions

## 1. Communication

- Always communicate with the user in Russian.
- Write plans, explanations, questions, and progress reports in Russian.
- Use English for code, variable names, functions, and technical identifiers.
- Write code comments in English.
- Explain technical decisions clearly and concisely.
- Do not make significant architectural changes without discussing them with the user.

## 2. Project Overview

CSV Analytics Studio is a browser-based application for exploring, editing, analyzing, and visualizing CSV datasets.

The project is developed with OpenAI Codex as an AI-assisted development learning exercise and will be published as a public GitHub portfolio project.

Core functionality:
- Import and export CSV files.
- View and edit datasets.
- Sort, search, and filter data.
- Calculate descriptive statistics.
- Analyze missing values and duplicates.
- Calculate correlations.
- Group and aggregate data.
- Create calculated columns.
- Build interactive charts.
- Switch between Data View and Dashboard View.
- Support English and Russian.
- Support light and dark themes.
- Save datasets and user preferences locally in the browser.

## 3. Technology Stack

Planned technologies:
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Plotly.js
- Papa Parse
- TanStack Table
- Dexie.js / IndexedDB
- i18next
- Vitest

Do not introduce additional frameworks or major dependencies without explaining the reason and obtaining approval.

## 4. Dependencies and Environment

- Install all project dependencies locally using npm.
- Never use `npm install -g`.
- Do not install project libraries globally.
- Do not modify global system configuration.
- Do not use `sudo` for dependency installation.
- Use `npm ci` when a valid package-lock.json already exists.
- Keep package.json and package-lock.json under version control.
- Add node_modules, dist, and environment files to .gitignore.
- Never commit dependencies or generated build artifacts.
- Do not create a Python virtual environment unless Python is explicitly introduced into the project.

## 5. Architecture

- The application must work entirely in the browser.
- Do not introduce a backend server.
- Do not introduce a server-side database.
- Use IndexedDB for persistent dataset storage.
- Keep data processing logic separate from UI components.
- Prefer simple, maintainable architecture.
- Avoid unnecessary abstractions and overengineering.
- Use TypeScript strict mode.
- Keep the application compatible with static hosting.

## 6. Data and Privacy

- Process uploaded CSV files locally in the browser.
- Do not upload datasets to external servers.
- Do not send user data to third-party APIs.
- Preserve the original dataset unless the user explicitly modifies it.
- Allow exporting edited data back to CSV.
- Handle invalid CSV files and unsupported data types gracefully.
- Do not silently discard data during import or export.

## 7. Dashboard and User Interface

- Provide Data View and Dashboard View.
- Both views must use the same underlying dataset.
- Allow users to select columns for analysis and visualization.
- Allow multiple charts on the dashboard.
- Allow configuring and removing individual charts.
- Use a predefined set of supported chart types.
- Use an automatic responsive chart layout.
- Do not implement drag-and-drop dashboard layout unless explicitly requested.
- Persist dashboard configurations and user preferences.
- Provide Russian and English localization.
- Provide light and dark themes.

## 8. Testing and Quality

- Write automated tests for important data processing functions.
- Test calculations, filtering, aggregation, and correlations.
- Test CSV import and export behavior.
- Test edge cases, including empty datasets, missing values, and invalid input.
- Run relevant tests after implementing changes.
- Run TypeScript checks and production builds when appropriate.
- Do not claim a feature works unless it has been verified.
- Clearly report any tests that could not be executed.

## 9. Development Workflow

Follow this workflow:

Plan → Implement → Review → Test → Deploy → Retrospective

- Before implementing a substantial feature, propose a short plan.
- Break complex tasks into small, reviewable steps.
- In Plan Mode, do not modify project files.
- Do not implement unrelated features.
- Explain important trade-offs.
- Summarize modified files after implementation.
- Report test results and known limitations.
- Do not automatically commit or push changes without user approval.
- Do not deploy without explicit approval.
- Prefer completing and verifying one feature before starting another.

## 10. GitHub Pages

The application must be deployable to:

https://aleksandr88p.github.io/csv-analytics-studio/

- Use the correct Vite base path: /csv-analytics-studio/
- Ensure all assets work under this base path.
- Avoid routing configurations that require server-side URL rewriting.
- Use GitHub Actions for automated builds and deployment.
- Do not introduce features requiring a continuously running server.

## 11. Portfolio Quality

- Write readable, maintainable code.
- Provide meaningful error messages.
- Ensure responsive layouts.
- Follow basic accessibility practices.
- Maintain a clean project structure.
- Prepare documentation in English and Russian.
- Document the use of AI-assisted development tools.
- Keep the application usable without accounts, subscriptions, or external services.
