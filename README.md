This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ShubhShreekh docs map

This repo's actual project documentation lives outside this boilerplate
README — start here depending on what you're looking for:

- [architecture.md](architecture.md) — how the system works end to end:
  components, data flow, the entitlement model, diagrams
- [plan.md](plan.md) — requirements/decisions: stack choices, domains,
  costs, compliance, the identity-provider decision record
- [build-plan.md](build-plan.md) — when things get built: phases, weeks,
  milestones
- [backend/README.md](backend/README.md) — the Go API's own technical map:
  package structure and the concrete OTP-auth request flow, file to file
- [infra/README.md](infra/README.md) — Terraform: hosting (S3+CloudFront /
  Amplify), how to deploy

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
