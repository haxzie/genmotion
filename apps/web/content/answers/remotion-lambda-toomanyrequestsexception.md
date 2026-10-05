---
title: "What does 'TooManyRequestsException: Rate Exceeded' mean on Remotion Lambda?"
description: "You hit your AWS Lambda concurrency limit. New AWS accounts are sometimes capped as low as 10. How to render anyway with concurrency set lower, see your limits, and request an increase."
tool: remotion
kind: error
errors:
  - "TooManyRequestsException: Rate Exceeded."
  - "ConcurrentInvocationLimitExceeded"
date: "2026-10-05"
updated: "2026-10-05"
tags: ["lambda", "aws", "concurrency", "quotas"]
related:
  - remotion-render-is-slow
  - remotion-render-stuck
  - is-remotion-worth-it-for-saas-feature-videos
sources:
  - label: "Remotion: AWS rate limit troubleshooting"
    url: "https://www.remotion.dev/docs/lambda/troubleshooting/rate-limit"
  - label: "Remotion: Lambda concurrency"
    url: "https://www.remotion.dev/docs/lambda/concurrency"
genmotion:
  heading: "No cloud quota to request"
  body: |-
    GenMotion exports render on your own machine, so there is no AWS account to set up and no Lambda concurrency limit to raise. It is not built for per-user videos rendered inside a product. It is for the launch videos, feature announcements and explainers you make yourself. GenMotion does not render Remotion projects: it builds Three.js and HyperFrames videos. [Remotion alternatives, compared honestly](/blog/remotion-alternatives).
faqs:
  - q: "Is this a Remotion bug?"
    a: "No. It is your AWS account's Lambda concurrency limit, the maximum number of functions that can run at once per region per account. Remotion Lambda spawns many functions per render, so a low limit is reached quickly."
  - q: "What is the default limit?"
    a: "By default the concurrency limit is 1000 functions per region, although in some regions the burst limit is only 500. But AWS says some accounts that are new to Lambda may get a very low limit, such as 10."
  - q: "Can I request an increase from the CLI?"
    a: "Yes: npx remotion lambda quotas increase. It only works for AWS root accounts, not the children of an organisation. Those can still request an increase in the AWS Service Quotas console."
---

```
TooManyRequestsException: Rate Exceeded.
ConcurrentInvocationLimitExceeded
```

## What it means

Your AWS account has reached its Lambda concurrency limit.

- **Concurrency limit:** the maximum number of Lambda functions that can run at the same time, per region per account.
- **Burst limit:** the maximum increase in concurrency within 10 seconds. It is 1000.

By default the concurrency limit is 1000 functions per region, though in some regions the burst limit is only 500. The surprise is **new accounts**. According to AWS, some accounts new to Lambda get a very low limit such as **10** when they start. A distributed Remotion render wants many more than that, so it fails straight away, and it looks like Remotion is broken.

## Fix: render anyway while you wait for a higher limit

From Remotion 4.0.517 you can set `concurrency` to `1` to render the whole video on the main function. It is slower than distributed rendering, but it lets you test:

```bash
npx remotion lambda render <serve-url> <composition-id> --concurrency=1
```

```ts
import { renderMediaOnLambda } from "@remotion/lambda/client";

await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-bds9aab",
  serveUrl: "https://example.com",
  composition: "MyVideo",
  codec: "h264",
  concurrency: 1,
});
```

A progress request may briefly use one extra invocation.

You can also use limited distributed rendering by setting `concurrency` below your limit and leaving room for the launch function, progress requests, other renders and unrelated Lambda functions in the same region. For an account limit of 10, this uses up to eight renderer functions and one launch function, leaving one invocation for progress:

```bash
npx remotion lambda render <serve-url> <composition-id> --concurrency=8
```

Use a lower number if other workloads share the quota.

## See your limits and request an increase

```bash
npx remotion lambda quotas
npx remotion lambda quotas increase
```

The first shows your limits. The second requests an increase, and works only for AWS root accounts. For accounts in an organisation, request it in the AWS Service Quotas console instead. If you get a permission error from `quotas`, repeat the user policy step in Remotion's Lambda setup guide and update your policy file in the AWS console.

## Plan for production

Request a quota increase for any production workload that needs higher concurrency, and remember that the number of videos you can render at once is your account limit divided by the functions each render spawns. Rendering several videos concurrently on a limited account can exhaust it quickly. If that arithmetic is the real problem, see [whether Remotion fits your use case](/answers/is-remotion-worth-it-for-saas-feature-videos).

## Check it worked

A single small render with `--concurrency=1` should complete. Then raise concurrency in steps while watching `npx remotion lambda quotas`.
