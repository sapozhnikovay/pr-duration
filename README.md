# PR Stats Console App

This script calculates the average duration (in hours) between the time a pull request becomes “ready for review” and the time it is merged. It uses GitHub’s API to fetch pull requests, filtered by organization, optional repository, a specified time period, and optionally by a specific GitHub username.

By default, if no user is specified, it shows stats for the authenticated user's PRs.

## Usage

```sh
node index.js --org my-org --period 1w --token YOUR_GITHUB_TOKEN
node index.js --org my-org --repo my-repo --period 3mo --user otherUser --token YOUR_GITHUB_TOKEN
node index.js --org my-org --start 2022-01-01 --end 2022-01-31 --token YOUR_GITHUB_TOKEN
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

## Libraries Used

- [@octokit/rest](https://github.com/octokit/rest.js): GitHub REST API client for Node.js
- [commander](https://github.com/tj/commander.js): The complete solution for node.js command-line interfaces
- [parse-duration](https://github.com/jkroso/parse-duration): Parse duration strings
- [@json2csv/plainjs](https://github.com/zemirco/json2csv): Convert JSON to CSV

## How to Run

1. Clone the repository:

   ```sh
   git clone https://github.com/sapozhnikovay/pr-stats.git
   cd pr-stats
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Run the script with the desired options:
   ```sh
   node index.js --org my-org --period 1w --token YOUR_GITHUB_TOKEN
   ```

Make sure to replace `YOUR_GITHUB_TOKEN` with your actual GitHub personal access token.
