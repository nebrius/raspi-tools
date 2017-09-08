const GitHubApi = require('github');

const github = new GitHubApi({
  debug: false,
  protocol: 'https',
  host: 'api.github.com',
  followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
  timeout: 5000
});

github.authenticate({
  type: 'token',
  token: 'd9fa55d13c9c799f25127ef17d2a1f483a6cad26'
});

const REPOS = [
  { owner: 'nebrius', repo: 'raspi-io' },
  { owner: 'nebrius', repo: 'raspi-io-core' },
  { owner: 'nebrius', repo: 'raspi' },
  { owner: 'nebrius', repo: 'raspi-board' },
  { owner: 'nebrius', repo: 'raspi-gpio' },
  { owner: 'nebrius', repo: 'raspi-i2c' },
  { owner: 'nebrius', repo: 'raspi-led' },
  { owner: 'nebrius', repo: 'raspi-peripheral' },
  { owner: 'tralves', repo: 'raspi-soft-pwm' },
  { owner: 'nebrius', repo: 'raspi-pwm' },
  { owner: 'nebrius', repo: 'raspi-serial' }
];

const stats = {};

process.on('exit', () => {
  const authors = Object.keys(stats);
  console.log(`${Object.keys(stats).length} authors`);
  console.log(`${REPOS.length} repos`);
  let totalCommitCount = 0;
  const sortedStats = [];
  for (const author of authors) {
    totalCommitCount += stats[author];
    sortedStats.push({ author, commitCount: stats[author] });
  }
  for (const author of sortedStats) {
    author.percent = Math.round((author.commitCount / totalCommitCount) * 100) / 100;
  }
  sortedStats.sort((a, b) => b.commitCount - a.commitCount);
  console.log(`${totalCommitCount} commits`);
  console.log(sortedStats);
});

REPOS.forEach((repo) => {
  github.repos.getStatsContributors(repo, (err, res) => {
    if (err) {
      console.error(err);
      process.exit(-1);
      return;
    }
    for (const dataEntry of res.data) {
      if (!stats[dataEntry.author.login]) {
        stats[dataEntry.author.login] = 0;
      }
      stats[dataEntry.author.login] += dataEntry.total;
    }
  });
});
