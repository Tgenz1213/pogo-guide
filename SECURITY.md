# Security Policy

## Supported Security Focus

As **pogo.guide** is maintained as a rolling, continuous-deployment web application rather than distinct versioned software releases, our security updates always target the latest live deployment branch. 

We actively monitor, secure, and patch the main operational state of the web application platform and its backing integrations (Nuxt, Sanity CMS, and Cloudflare Pages architecture).

## Reporting a Vulnerability

We take the security of **pogo.guide**, our infrastructure, and our users' data very seriously. If you discover a security vulnerability, we appreciate your help in reporting it to us responsibly via a private channel.

### Contact Information

Please report security vulnerabilities exclusively by email to: admin@pogo.guide

### What to Include in Your Report

To help us triage and patch the issue as quickly as possible, please include:
1. **Description:** A detailed explanation of the vulnerability and its potential impact.
2. **Steps to Reproduce:** Clear, step-by-step instructions or a minimal Proof of Concept (PoC) payload, script, or replication criteria.
3. **Environment Details:** Any specific layers involved (e.g., Frontend Web components, server-side event handlers/API routes, or Sanity Studio Schema definitions).

### Our Process & Commitments

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours.
- **Triage & Fix:** We will keep you updated as we investigate, validate, and develop a patch for the reported issue.
- **Responsible Disclosure:** We ask that you do not publicly disclose or share the vulnerability with others until we have had a reasonable amount of time to deploy a fix and secure our active production environment.

## Security Practices & Safeguards

As part of maintaining this project, we implement and expect several standard security baselines across our ecosystem:

- **Token & Key Isolation:** API tokens (such as `NUXT_SANITY_WRITE_TOKEN` or `CLOUDFLARE_API_TOKEN`) must never be hardcoded or checked into source control. Always utilize system environment variables or secure vault managers inside your deployment dashboards.
- **Automated Spam & Abuse Mitigation:** Public forms (such as guide suggestions or user submission vectors) must utilize server-side token validation (e.g., Cloudflare Turnstile Siteverify API) along with cryptographic honeypots to mitigate automated injections, balance-draining spam, or bot vectors.
- **Dependency Tracking:** We utilize lockfiles (`pnpm-lock.yaml`) with frozen checks inside our build and continuous integration environments to guarantee supply chain integrity.
