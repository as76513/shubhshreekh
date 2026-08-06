# Infrastructure (Terraform) — ShubShreekh Frontend

Provisions **S3 + CloudFront** static hosting for the Next.js frontend
(built as a static export), in Mumbai (`ap-south-1`).

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
(The exact command is printed as the `deploy_command` output.)

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
`../docs/domain-setup.md`.

## Cost
S3 + CloudFront at low traffic is ~₹0. See `../docs/costs.md`.
