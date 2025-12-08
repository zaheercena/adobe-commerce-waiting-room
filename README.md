## adobe-commerce-waiting-room
Waiting Room – Detailed Technical & Operational Documentation

# Flow Diagram:
┌─────────────┐
│   Visitor   │
└──────┬──────┘
       │ 1. Request website
       ▼
┌─────────────────────────────────────────┐
│         Fastly CDN (VCL)                │
│  ┌───────────────────────────────────┐  │
│  │ 1. Check if session cookie exists │  │
│  │ 2. Generate/Get session ID        │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  │ 3. API Call           │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │ Call API Gateway:                 │  │
│  │ GET /check/th_store/session123    │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│   AWS Lambda API (Node.js + Redis)   │
│  ┌────────────────────────────────────┐  │
│  │ 4. Check Redis:                    │  │
│  │    - Does session exist?           │  │
│  │    - Current user count < 35000?    │  │
│  └────────────────┬───────────────────┘  │
│                   │                      │
│         ┌─────────┴─────────┐            │
│         ▼                   ▼            │
│    ┌─────────┐         ┌─────────┐      │
│    │ < 35000  │         │ >= 35000 │      │
│    │ users   │         │ users   │      │
│    └────┬────┘         └────┬────┘      │
│         │                   │            │
│         │ 5a. Response      │ 5b. Resp   │
│         │ {allowed:true}    │ {allowed:  │
│         │                   │  false}    │
└─────────┼───────────────────┼────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────┐
│         Fastly CDN (VCL)                │
│  ┌──────────────┐    ┌───────────────┐  │
│  │ 6a. Allow    │    │ 6b. Show      │  │
│  │ Access       │    │ Waiting Room  │  │
│  │ (200 OK)     │    │ (503 Error)   │  │
│  └──────┬───────┘    └───────┬───────┘  │
└─────────┼────────────────────┼───────────┘
          │                    │
          ▼                    ▼
    ┌──────────┐         ┌──────────┐
    │ Website  │         │ "Please  │
    │ Content  │         │  Wait"   │
    └──────────┘         └──────────┘


# Architecture with Serverless Redis
┌─────────────────────────────────────────────────────┐
│                    35,000 Visitors                   │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │     Fastly    │ (VCL checks session)
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │  API Gateway  │ (HTTP API)
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Lambda (100x) │ (Auto-scales)
              └───────┬───────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Serverless Redis       │ (Auto-scales)
         │ - 10 GB storage        │
         │ - 5,000 ECPUs/sec      │
         │ - 5-15ms latency       │
         └────────────────────────┘

Overview

This document provides a complete end-to-end explanation of how to
configure a Waiting Room solution using Fastly, AWS S3, CloudFront, and
Magento’s Fastly module. It is written to be understandable, practical,
and aligned with real engineering workflows.



The Waiting Room ensures that during high‑traffic events (flash sales,
product drops, seasonal peaks), your site remains stable by temporarily
redirecting excess visitors to a controlled holding page hosted on AWS.

------------------------------------------------------------------------

1. AWS Requirements

1.1 S3 Bucket (Static Asset Storage)

You will need an S3 bucket that stores the following:

- index.html(in our case it was waiting-room-id.html and waiting-room-th.html) — your waiting room page [keep every styling and scripting in this html files for simplicity]

Important Configuration Points:

- ✔ For Cross-Domain issue you will need to create a subdomain and point to s3 via Cloudfront. in case you don't have access to create/point subdomain then upload simply these HTML files to your PUB directory on Adobe Commerce Cloud/Premis/comunity and skip completely this S3 config part.
- ✔ Bucket Policy must allow CloudFront access
- ✔ Upload your static waiting room files to the root or a subfolder
- ✔ Versioning recommended for safety

Your S3 bucket acts as the origin for CloudFront or may be accessed
directly depending on your architecture.

------------------------------------------------------------------------

1.2 CloudFront Distribution (Recommended)

CloudFront is used to serve the waiting room page globally, reduce
latency, and avoid unnecessary load on S3.

Key CloudFront Settings:

- Origin: your S3 bucket
- Viewer Protocol Policy: Redirect HTTP → HTTPS
- Cache Behavior:
- HTML → short TTL (TTL = 0 if you need instant updates)
- CSS/JS/Images → long TTL
- Invalidations: use /index.html when updating your UI

CloudFront ensures every user in the waiting room gets a fast and stable
experience regardless of region.

------------------------------------------------------------------------

2. Magento Admin Configuration (Fastly Module)

To configure custom VCL for the waiting room logic:

Stores
→ Configuration
→ Advanced
→ System
→ Full Page Cache
→ Fastly Configuration
→ Custom VCL Snippets

This section is where Fastly allows you to insert custom VCL logic to
decide who gets into the website and who is routed to the waiting room.

------------------------------------------------------------------------

3. Creating a Custom VCL Snippet

When you press “Create”, Magento opens the “Create Custom Snippet”
modal, which includes:

Field Breakdown

Name
A descriptive identifier for your snippet.
Example:
waiting_room_recv
throttle_recv
event_block_recv

Type
Determines where Fastly will inject this snippet.
For controlling incoming traffic, select:
recv
This is the earliest stage of the request lifecycle.

Priority
Determines the order in which multiple snippets run.
Lower number = earlier execution.
Default (100) is fine unless you have advanced logic.

VCL
This is where your logic goes.
The snippet determines:

- Should this visitor be allowed in?
- Are we above traffic limits?
- Has the visitor been issued a token?
- Should they be redirected to the waiting room?

------------------------------------------------------------------------

-------------------------------------VCL Snippet Start-------------------------------------

Type: error
Priority:10
Name:waiting_room_redirect
VCL:
```
# Waiting Room - Redirect based on domain
if (obj.status == 750) {
set obj.status = 302        ;
set obj.response = "Found";

# Check which domain and redirect to appropriate waiting room
if (req.http.host ~ "id.hm.com") {
set obj.http.Location = "https://id.hm.com/waiting-room-id.html?return=" + req.url ;
} else {
set obj.http.Location = "https://th.hm.com/waiting-room-th.html?return=" + req.url ;
}

set obj.http.Content-Type = "text/html; charset=utf-8";
return(deliver)                                         ;
}
```

Type: recv
Priority:10
Name:waiting_room_check
VCL:
```
if (req.http.host == "admin.ecom.gillcapitalinternal.com") {
return(pass)                                                 ;
}

# Waiting Room - Check for session cookie
if (req.url.path == "/waiting-room.html") {
return(pass)                                ;
}

# Waiting Room - Check for free shipping message
if (req.url.path == "/customer/section/load/?sections=free_shipping_message") {
return(pass)                                                                    ;
}

if (req.request == "GET" &&
req.url.path !~ "^/(admin|static|media|pub/static|pub/media)/" &&
req.url.path !~ "\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|json|xml)$") {

# Extract session cookie
declare local var.has_session BOOL ;
set var.has_session = false        ;

if (req.http.Cookie ~ "waiting_room_session=") {
set var.has_session = true                       ;
}

# If no session, trigger waiting room
if (!var.has_session) {
error 750 "Waiting Room";
}
}
```

Type: recv
Priority:5
Name:cache_waiting_room
VCL:
```
# Cache both waiting room pages at Fastly edge
if (req.url.path == "/waiting-room-th.html" || req.url.path == "/waiting-room-id.html") {
unset req.http.Cookie                                                                     ;
set req.http.X-Pass-Authorization = "1";
return(lookup)                                                                            ;
}
```

Type: deliver
Priority:10
Name:noindex_waiting_room
VCL:
```
# Prevent search engines from indexing waiting room pages
if (req.url.path == "/waiting-room-th.html" || req.url.path == "/waiting-room-id.html") {
  set resp.http.X-Robots-Tag = "noindex, nofollow";
}
```

-------------------------------------VCL Snippet End-------------------------------------

4. How the Waiting Room Actually Works (Conceptual Flow)

1. User visits the website
- They request /, /products/abc, /category/dresses, etc.
2. Fastly executes your custom VCL
- The logic runs before Magento sees the request.
3. Fastly checks traffic load or token
- You decide the rule:
- Random percentage
- Concurrency count
- Token validation
- High‑traffic event flag
- IP throttling
4. If allowed → pass to Magento
- User continues normally.
5. If blocked → redirect to Waiting Room
- Fastly sends user to your S3/CloudFront page.
- Example:
https://your-cloudfront-url/waiting-room/index.html
6. User waits and retries automatically
- Based on JS logic in your waiting room page.
7. When load reduces → VCL lets more users in
- The system stabilizes traffic naturally.

------------------------------------------------------------------------

------------------------------------------------------------------------

Fastly Waiting Room – Module Documentation

This module integrates a Fastly-based Waiting Room solution for Adobe
Commerce. It prevents server overload during high-demand events by
routing overflow traffic to an S3/CloudFront-hosted waiting room page.

Configuration Path

Stores → Configuration → Advanced → System →
Full Page Cache → Fastly Configuration → Custom VCL Snippets

Screenshot Reference
https://prnt.sc/S2F8OQmG5TTe,
https://prnt.sc/a5-BMPsTq0nJ

What You Need

- AWS S3 bucket with waiting room HTML/CSS/JS
- (Optional) CloudFront distribution for global delivery
- Fastly credentials configured in Magento
- Custom VCL snippet added under recv section

What This Module Does

- Adds Fastly logic to throttle traffic
- Routes blocked users to your waiting room
- Supports token-based or rule-based admission
- Works seamlessly with Magento’s Fastly caching

Screenshot Reference for AWS Configure
https://prnt.sc/pxpWfbSSDaqK,
https://prnt.sc/W4BapQWEhKtf,
https://prnt.sc/XT8N6F7NHHs7,
https://prnt.sc/Rcm5nMpkGGJ,
https://prnt.sc/xe2kvbHeL7NQ,
https://prnt.sc/bj5Vn13Dfx0R


------------------------------------------------------------------------

------------------------------------------------------------------------
