# pr-duration

Calculate and analyze Pull Request durations and metrics using GitHub's API. This tool helps you track and analyze the time between when pull requests become ready for review and when they are merged.

## Installation

```bash
npm install -g pr-duration
```

## Usage

```bash
pr-duration --org my-org --period 1w --token YOUR_GITHUB_TOKEN
pr-duration --org my-org --repo my-repo --period 3mo --user otherUser --token YOUR_GITHUB_TOKEN
pr-duration --org my-org --start 2022-01-01 --end 2022-01-31 --token YOUR_GITHUB_TOKEN
```

## Options

- `-o, --org <org>`: GitHub organization name (required)
- `-r, --repo <repo>`: Filter by specific repository (optional)
- `-p, --period <period>`: Time period (e.g., '2d' for 2 days, '1w' for 1 week, '3mo' for 3 months, '1y' for 1 year)
- `--start <date>`: Start date (YYYY-MM-DD)
- `--end <date>`: End date (YYYY-MM-DD)
- `-u, --user <username>`: Filter PRs by GitHub username (defaults to the authenticated user)
- `-t, --token <token>`: GitHub personal access token (required)
- `--export <format>`: Export data in the specified format (json or csv)

## Authentication

You can provide your GitHub token in two ways:

1. Via command line option:

```bash
pr-duration --org my-org --period 1w --token ghp_your_token_here
```

2. Via environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
pr-duration --org my-org --period 1w
```

The command line option takes precedence over the environment variable if both are provided.

## Examples

```bash
# Get PR stats for the last week
pr-duration --org my-org --period 1w --token ghp_your_token_here

# Export PR stats to CSV
pr-duration --org my-org --period 1mo --export csv --token ghp_your_token_here

# Get stats for specific repository and user
pr-duration --org my-org --repo my-repo --user johndoe --period 3mo --token ghp_your_token_here
```

## Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token with repo scope

## Features

- Calculate average PR review duration
- Filter by organization, repository, and user
- Flexible time period selection
- Export data in JSON or CSV format
- Detailed PR timeline analysis

## Libraries Used

- [@octokit/rest](https://github.com/octokit/rest.js): GitHub REST API client
- [commander](https://github.com/tj/commander.js): Command-line interface
- [parse-duration](https://github.com/jkroso/parse-duration): Time period parsing
- [@json2csv/plainjs](https://github.com/zemirco/json2csv): CSV export

## License

MIT © Aleksei Sapozhnikov
