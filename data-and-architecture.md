# Data Storage & Updated Architecture (web-first)

This supersedes the earlier Flutter-based plan. The "one codebase for web + mobile" requirement plus payments and phone-OTP changed the stack. Here's where everything lives.

## Stack (updated)

| Layer | Earlier plan | Now | Why it changed |
|---|---|---|---|
| Frontend | Flutter (mobile) | **Next.js / React (web + PWA)** | One codebase serves desktop web, mobile web, and installable app (TWA → Play Store) |
| Frontend hosting | *(unspecified)* | **CloudFront + S3** (static export, Mumbai origin) | All-AWS, IaC-native, full control, best AWS learning; frontend is a static Next.js export that calls the Go API |
| Backend | Go API | **Go API** (unchanged) | — |
| Primary DB | DynamoDB | **DynamoDB** (unchanged) | Key-based access patterns fit |
| Auth | Cognito | **Cognito _or_ OTP provider (MSG91/Firebase)** | Phone-OTP + Indian SMS/DLT overhead |
| Payments | Stripe | **Razorpay** | UPI/INR native, India-first |
| Hosting | Serverless | **Lambda + API Gateway** (unchanged) | Scales to zero |

## Where each piece of data lives

Nothing sensitive is stored in the browser/app — only a session token in memory/secure storage. All real data is server-side.

| Data | Home | Notes |
|---|---|---|
| Identity (phone, verified flag, user ID) | Auth provider + **DynamoDB** | Auth provider runs OTP; your DB stores the resulting user record |
| Profile, subscription tier, watchlist, prefs | **DynamoDB** | `users`, `subscriptions`, `watchlists` tables |
| Payment / order records | **DynamoDB** (`orders`) | Store Razorpay IDs + verified status only — **never card/UPI details** |
| Card / UPI sensitive data | **Razorpay** (not us) | Keeps you out of PCI scope entirely |
| Advisory content (ideas, ratings) | **DynamoDB** or small relational | Your actual RA product data |
| Advice audit log (who saw what, when) | **DynamoDB / S3 (append-only)** | SEBI RAs must retain records |
| Static assets | **S3 + CloudFront** | App shell, images |

## Payment flow (the security-critical part)

```
1. User taps "Choose Premium"        (browser)
2. Browser asks backend to create an order   → POST /orders {planId:"premium"}
3. Backend looks up price SERVER-SIDE (never trusts client amount),
   calls Razorpay, returns razorpay_order_id
4. Browser opens Razorpay checkout with that order_id
5. User pays; Razorpay returns order_id + payment_id + SIGNATURE to browser
6. Browser sends all three to backend   → POST /payments/verify
7. Backend RE-COMPUTES the HMAC signature with the Razorpay key secret
   and compares. Only if it matches:
8. Backend writes the subscription to DynamoDB and grants access
```

The golden rule: **the browser never decides that a payment succeeded.** Razorpay signs the result; the Go backend verifies that signature (`payments.VerifyPaymentSignature`) before granting anything. A tampered client can't fake a payment or pay the wrong amount, because both the price and the verification live server-side.

## Compliance hooks (SEBI RA — your compliance advisor owns these)

- Subscription fees must follow SEBI RA fee norms; proper GST invoicing required
- KYC of subscribers where mandated
- Mandatory grievance-redressal + refund handling
- Retain advice/audit records (the audit-log table above)
- Display RA reg. no., BASL membership, standard risk disclaimer

The code implements the *mechanics* correctly; the *compliance layer* sits on top and is signed off separately.
