/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const basePath = isGithubPages && repoName ? `/${repoName}` : '';

module.exports = {
  allowedDevOrigins: ['192.168.178.24'],
  serverExternalPackages: ['better-sqlite3', '@anthropic-ai/claude-agent-sdk'],
  ...(isGithubPages
    ? {
        output: 'export',
        basePath,
        assetPrefix: `${basePath}/`,
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
      }
    : {}),
};
