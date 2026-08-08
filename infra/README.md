# Infrastructure (Terraform) — ShubShreekh Frontend

Provisions **S3 + CloudFront** static hosting for the Next.js frontend
(built as a static export), in Mumbai (`ap-south-1`).

> **⚠️ Temporary: CloudFront is currently blocked in this AWS account/org.**
> `hosting_mode` defaults to `"amplify"`, which provisions an AWS Amplify
> app as a stand-in for testing instead. This is **not** a change to the
> committed architecture — [plan.md](../plan.md) and
> [architecture.md](../architecture.md) still say S3 + CloudFront, and
> `main.tf` still has the CloudFront resources (just gated off). Set
> `hosting_mode = "cloudfront"` in `terraform.tfvars` once access is
> restored. See "Amplify mode (temporary)" below for the manual-deploy flow.

## Architecture

```
Next.js (output: 'export')  ->  ./out  ->  S3 (private)
                                            │ OAC (only CloudFront can read)
                                            ▼
                                       CloudFront (HTTPS, CDN)  ->  users
```

Dynamic data comes from the separate **Go API** (client-side fetch), so the
frontend itself is fully static.

## Prerequisites
- Terraform >= 1.5
- AWS CLI configured (`aws configure`)
- Node.js (to build the Next.js export)

## One-time: build Next.js for static export

In the Next.js app, set in `next.config.js`:
```js
const nextConfig = { output: 'export', images: { unoptimized: true } };
module.exports = nextConfig;
```
Then:
```bash
npm run build      # produces ./out (static files)
```

## Provision the infra

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Outputs give you the CloudFront `live_url` and a ready-made `deploy_command`.

## Deploy the site (after each build)

```bash
aws s3 sync ./out s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths '/*'
```
(The exact command is printed as the `deploy_command` output. This is the
`hosting_mode = "cloudfront"` flow — see below for `"amplify"`.)

## Amplify mode (temporary)

While `hosting_mode = "amplify"` (the current default), there's no
CloudFront/S3 to sync to. The Amplify app has no `repository` configured, so
deploys are manual (zip upload) rather than git-triggered builds:

```bash
cd out && zip -r ../out.zip . && cd ..

# Starts a deployment, returns a jobId + a zipUploadUrl
aws amplify create-deployment --app-id <amplify_app_id> --branch-name main

# Upload the zip to the returned zipUploadUrl
curl -T out.zip "<zipUploadUrl>"

# Kick off the deployment with the jobId from step 1
aws amplify start-deployment --app-id <amplify_app_id> --branch-name main --job-id <jobId>
```

`terraform output amplify_app_id` and `terraform output live_url` give you
the app ID and the resulting `https://main.<app-id>.amplifyapp.com` URL.

## Security notes
- S3 bucket is **private** — no public access. Only CloudFront reads it, via
  **Origin Access Control (OAC)**.
- **HTTPS enforced** (HTTP redirects to HTTPS).
- Bucket **encrypted** (SSE-S3) and **versioned**.
- `terraform.tfvars`, state files, and `.terraform/` are **gitignored**.
- Before collaborating, move state to the encrypted **S3 backend** (commented
  in `main.tf`).

## Custom domain (later)
When Route 53 DNS is ready: create an ACM cert **in us-east-1**, then enable
the `aliases` + `viewer_certificate` ACM lines in `main.tf`. See
`../plan.md` (Domain & subdomains section).

## Cost
S3 + CloudFront at low traffic is ~₹0. See `../plan.md` (Cost breakdown section).
