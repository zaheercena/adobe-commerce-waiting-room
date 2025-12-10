# Adobe Commerce Waiting Room Solution

A comprehensive Fastly-based waiting room implementation for Adobe Commerce Cloud that prevents server overload during high-demand events by routing overflow traffic to a controlled holding page.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
   - [Adobe Commerce Cloud Requirements](#1-adobe-commerce-cloud-requirements)
   - [AWS Requirements](#2-aws-requirements)
   - [Development Tools](#3-development-tools)
   - [Network & Domain Requirements](#4-network--domain-requirements)
   - [Technical Knowledge Requirements](#5-technical-knowledge-requirements)
   - [Budget & Cost Considerations](#6-budget--cost-considerations)
   - [Testing Environment](#7-testing-environment)
   - [Access Credentials Checklist](#8-access-credentials-checklist)
   - [Pre-Implementation Checklist](#9-pre-implementation-checklist)
   - [Support & Documentation Links](#10-support--documentation-links)
2. [Architecture Overview](#architecture-overview)
   - [Flow Diagram](#flow-diagram)
   - [Architecture with Serverless Redis](#architecture-with-serverless-redis)
3. [AWS Infrastructure Setup](#aws-infrastructure-setup)
   - [ElastiCache Redis Configuration](#31-elasticache-redis-session-management)
   - [Lambda Function Setup](#32-aws-lambda-function)
   - [API Gateway Configuration](#33-api-gateway)
4. [Fastly VCL Configuration](#fastly-vcl-configuration)
   - [VCL Snippets](#vcl-snippets)
   - [Configuration Path](#configuration-path)
5. [Waiting Room HTML Implementation](#waiting-room-html-implementation)
6. [Testing & Validation](#testing--validation)
   - [Postman API Testing](#postman-api-testing)
   - [Browser Testing](#browser-testing)
7. [Deployment Checklist](#deployment-checklist)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before implementing the Waiting Room solution, ensure you have the following access, tools, and configurations in place.

### 1. Adobe Commerce Cloud Requirements

#### 1.1 Platform Access
- ✅ **Adobe Commerce Cloud** (or Magento 2 Open Source/Commerce)
- ✅ **Fastly CDN** enabled and configured
- ✅ Admin access to Magento Admin Panel
- ✅ Access to Magento Cloud CLI or SSH (for file deployment)
- ✅ Git repository access (for deploying files to `pub/` directory)

#### 1.2 Fastly Configuration
- ✅ Fastly service ID and API token
- ✅ Ability to create and activate custom VCL snippets
- ✅ Access to Fastly Console: https://manage.fastly.com/

**Path in Magento Admin:**
```
Stores → Configuration → Advanced → System → Full Page Cache → Fastly Configuration
```

---

### 2. AWS Requirements

#### 2.1 AWS Account & Permissions
You need an AWS account with permissions to create and manage:
- ✅ **Lambda functions**
- ✅ **ElastiCache Redis clusters**
- ✅ **API Gateway**
- ✅ **VPC, Subnets, Security Groups**
- ✅ **IAM Roles and Policies**
- ✅ **CloudWatch Logs** (for monitoring)

#### 2.2 AWS Services Setup

**ElastiCache Redis**
- **Instance Type:** `cache.r7g.large` or higher
- **Engine Version:** Redis 7.x
- **Network:** Must be in a VPC with private subnets
- **Security Group:** Allow inbound on port `6379` from Lambda security group

**AWS Lambda**
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB minimum
- **Timeout:** 30 seconds
- **VPC Access:** Must be in same VPC as Redis
- **Execution Role:** With permissions for:
  - CloudWatch Logs
  - VPC network interfaces (ENI)
  - ElastiCache access

**API Gateway**
- **Type:** HTTP API (recommended) or REST API
- **CORS:** Enabled for your domain
- **Stage:** `staging` or `production`
- **Integration:** Lambda proxy integration

---

### 3. Development Tools

#### 3.1 Required Tools
- ✅ **Node.js** (v18 or v20) - for Lambda development
- ✅ **npm** - for installing dependencies
- ✅ **Git** - for version control and deployment
- ✅ **Text Editor/IDE** - VS Code, Sublime, etc.
- ✅ **Terminal/Command Line** access

#### 3.2 Optional Tools
- ✅ **Postman** - for API testing
- ✅ **Redis CLI** - for debugging Redis
- ✅ **Fastly CLI** - for VCL validation
- ✅ **AWS SAM CLI** - for local Lambda testing

---

### 4. Network & Domain Requirements

#### 4.1 Domain Configuration
- ✅ Valid SSL certificate for your domain
- ✅ HTTPS enabled (required for secure cookies)
- ✅ DNS access (if using custom subdomain for waiting room)

#### 4.2 Store URLs
You need to know your store URLs. Example:
```
Thailand Store (EN): https://th.mywebsite.com/th_en
Thailand Store (TH): https://th.mywebsite.com/th_th
Indonesia Store (EN): https://id.mywebsite.com/id_en
Indonesia Store (ID): https://id.mywebsite.com/id_id
```

---

### 5. Technical Knowledge Requirements

#### 5.1 Required Skills
- ✅ Basic understanding of **VCL (Varnish Configuration Language)**
- ✅ Familiarity with **AWS Lambda** and **API Gateway**
- ✅ Basic **Node.js** knowledge
- ✅ Understanding of **Redis** key-value store
- ✅ Knowledge of **HTTP cookies** and **sessions**
- ✅ Basic **HTML/CSS/JavaScript** for waiting room page

#### 5.2 Helpful (But Not Required)
- Understanding of CDN caching behavior
- Experience with Magento/Adobe Commerce
- AWS VPC networking concepts
- Serverless architecture patterns

---

### 6. Budget & Cost Considerations

#### 6.1 Estimated Monthly Costs (35,000 concurrent users)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| **AWS Lambda** | ~10M requests/month | ~$20/month |
| **ElastiCache Redis** | cache.r7g.large | ~$150/month |
| **API Gateway** | ~10M requests/month | ~$35/month |
| **Data Transfer** | Outbound traffic | ~$10/month |
| **CloudWatch Logs** | Monitoring | ~$5/month |
| **Total** | | **~$220/month** |

#### 6.2 Fastly Costs
- Fastly pricing depends on your existing plan
- VCL snippets are included in all plans
- No additional cost for custom VCL logic

---

### 7. Testing Environment

#### 7.1 Recommended Setup
- ✅ **Staging environment** for testing before production
- ✅ Separate Lambda function for staging
- ✅ Separate Redis instance for staging (optional)
- ✅ Test domain or subdomain

#### 7.2 Browser Requirements for Testing
- ✅ Chrome/Firefox/Safari (latest versions)
- ✅ Incognito/Private browsing mode (for testing cookies)
- ✅ Browser DevTools knowledge (for debugging)

---

### 8. Access Credentials Checklist

Before starting, gather these credentials:

#### Magento/Adobe Commerce:
- [ ] Admin panel URL and login
- [ ] Fastly Service ID
- [ ] Fastly API Token

#### AWS:
- [ ] AWS Account ID
- [ ] IAM user with required permissions
- [ ] AWS Access Key ID
- [ ] AWS Secret Access Key
- [ ] AWS Region (e.g., `ap-southeast-1`)

#### Redis:
- [ ] Redis cluster endpoint
- [ ] Redis port (default: 6379)
- [ ] Redis AUTH token (if enabled)

#### API Gateway:
- [ ] API Gateway endpoint URL
- [ ] API Gateway stage name

---

### 9. Pre-Implementation Checklist

Before proceeding with implementation, verify:

- [ ] Fastly is active and serving traffic
- [ ] You can create and activate VCL snippets in Magento Admin
- [ ] AWS account has necessary permissions
- [ ] You have access to deploy files to Magento `pub/` directory
- [ ] You can create Lambda functions in AWS
- [ ] You can create ElastiCache Redis clusters
- [ ] You have a staging environment for testing
- [ ] You understand the expected traffic volume
- [ ] You have budget approval for AWS costs
- [ ] You have backup/rollback plan

---

### 10. Support & Documentation Links

#### Official Documentation:
- [Fastly VCL Documentation](https://developer.fastly.com/reference/vcl/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [ElastiCache Redis Documentation](https://docs.aws.amazon.com/elasticache/)
- [Adobe Commerce Fastly Module](https://experienceleague.adobe.com/docs/commerce-cloud-service/user-guide/cdn/fastly.html)

#### Useful Tools:
- [Fastly Fiddle](https://fiddle.fastly.dev/) - Test VCL online
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis GUI
- [Postman](https://www.postman.com/) - API testing

---

## Architecture Overview

### Flow Diagram

```
┌─────────────┐
│   Visitor   │
└──────┬──────┘
       │ 1. Request website
       ▼
┌─────────────────────────────────────────┐
│         Fastly CDN (VCL)                │
│ ┌───────────────────────────────────┐   │
│ │ 1. Check if session cookie exists │   │
│ │ 2. Generate/Get session ID        │   │
│ └───────────────┬───────────────────┘   │
│                 │                       │
│                 │ 3. API Call           │
│                 ▼                       │
│ ┌───────────────────────────────────┐   │
│ │ Call API Gateway:                 │   │
│ │ GET /check?session_id=session123  │   │
│ └───────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  AWS Lambda API (Node.js + Redis)        │
│ ┌────────────────────────────────────┐   │
│ │ 4. Check Redis:                    │   │
│ │    - Does session exist?           │   │
│ │    - Current user count < 5000?    │   │
│ └────────────────┬───────────────────┘   │
│                  │                       │
│      ┌───────────┴───────────┐           │
│      ▼                       ▼           │
│ ┌─────────┐            ┌─────────┐       │
│ │ < 35000 │            │ >= 35000│       │
│ │  users  │            │  users  │       │
│ └────┬────┘            └────┬────┘       │
│      │                      │            │
│      │ 5a. Response         │ 5b. Resp   │
│      │ {allowed:true}       │ {allowed:  │
│      │                      │  false}    │
└──────┼──────────────────────┼────────────┘
       │                      │
       ▼                      ▼
┌─────────────────────────────────────────┐
│         Fastly CDN (VCL)                │
│ ┌──────────────┐      ┌───────────────┐ │
│ │ 6a. Allow    │      │ 6b. Show      │ │
│ │    Access    │      │    Waiting    │ │
│ │   (200 OK)   │      │    Room       │ │
│ │              │      │  (302 Redir)  │ │
│ └──────┬───────┘      └───────┬───────┘ │
└────────┼──────────────────────┼─────────┘
         │                      │
         ▼                      ▼
  ┌──────────┐          ┌──────────┐
  │ Website  │          │ "Please  │
  │ Content  │          │  Wait"   │
  └──────────┘          └──────────┘
```

---

### Architecture with Serverless Redis

```
┌─────────────────────────────────────────────────────┐
│              35,000 Visitors                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │    Fastly     │ (VCL checks session)
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ API Gateway   │ (HTTP API)
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Lambda (100x) │ (Auto-scales)
              └───────┬───────┘
                      │
                      ▼
          ┌────────────────────────┐
          │  Serverless Redis      │ (Auto-scales)
          │  - 10 GB storage       │
          │  - 5,000 ECPUs/sec     │
          │  - 5-15ms latency      │
          └────────────────────────┘
```

---

## AWS Infrastructure Setup

### 3.1 ElastiCache Redis (Session Management)

The waiting room uses **ElastiCache Redis** to track concurrent users in real-time.

#### Configuration:
- **Engine:** Redis 7.x
- **Node Type:** `cache.r7g.large`
- **Number of Nodes:** 1 (can scale to 2+ for HA)
- **Parameter Group:** `default.redis7`
- **Subnet Group:** Private subnets in your VPC
- **Security Group:** Allow port 6379 from Lambda security group only

#### Create Redis Cluster:

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id waiting-room-redis \
  --engine redis \
  --cache-node-type cache.r7g.large \
  --num-cache-nodes 1 \
  --engine-version 7.0 \
  --cache-subnet-group-name your-subnet-group \
  --security-group-ids sg-xxxxxxxxx
```

#### Get Redis Endpoint:

```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id waiting-room-redis \
  --show-cache-node-info
```

Note the **Primary Endpoint** - you'll need this for Lambda configuration.

---

### 3.2 AWS Lambda Function

#### Lambda Code (index.js):

```javascript
const redis = require('redis');

// Configuration
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const MAX_USERS = parseInt(process.env.MAX_USERS) || 5000;
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 1800; // 30 minutes

let redisClient;

// Initialize Redis connection
async function getRedisClient() {
  if (!redisClient) {
    redisClient = redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT
      }
    });
    
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  // Handle OPTIONS for CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  const path = event.requestContext.http.path;
  const queryParams = event.queryStringParameters || {};
  
  try {
    const client = await getRedisClient();
    
    // Health check
    if (path === '/health') {
      await client.ping();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ status: 'healthy', redis: 'connected' })
      };
    }
    
    // Get current status
    if (path === '/status') {
      const currentUsers = await client.dbSize();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          current_users: currentUsers,
          max_users: MAX_USERS,
          available_slots: Math.max(0, MAX_USERS - currentUsers)
        })
      };
    }
    
    const sessionId = queryParams.session_id;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'session_id required' })
      };
    }
    
    // Check if user can access
    if (path === '/check') {
      const exists = await client.exists(sessionId);
      const currentUsers = await client.dbSize();
      const availableSlots = Math.max(0, MAX_USERS - currentUsers);
      
      if (exists) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            allowed: true,
            action: 'allow',
            current_users: currentUsers,
            max_users: MAX_USERS,
            available_slots: availableSlots
          })
        };
      }
      
      if (currentUsers < MAX_USERS) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            allowed: true,
            action: 'allow',
            current_users: currentUsers,
            max_users: MAX_USERS,
            available_slots: availableSlots
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          allowed: false,
          action: 'wait',
          current_users: currentUsers,
          max_users: MAX_USERS,
          available_slots: 0
        })
      };
    }
    
    // Enter session
    if (path === '/enter') {
      const currentUsers = await client.dbSize();
      
      if (currentUsers >= MAX_USERS) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: 'Site is full',
            current_users: currentUsers
          })
        };
      }
      
      await client.setEx(sessionId, SESSION_TIMEOUT, Date.now().toString());
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Session created',
          session_id: sessionId,
          expires_in: SESSION_TIMEOUT
        })
      };
    }
    
    // Exit session
    if (path === '/exit') {
      await client.del(sessionId);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Session removed'
        })
      };
    }
    
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

#### Create Deployment Package:

```bash
# Create project directory
mkdir waiting-room-lambda
cd waiting-room-lambda

# Initialize npm
npm init -y

# Install dependencies
npm install redis

# Create index.js with the code above

# Create deployment package
zip -r function.zip index.js node_modules/
```

#### Deploy Lambda:

```bash
aws lambda create-function \
  --function-name waiting-room-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-vpc-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --vpc-config SubnetIds=subnet-xxx,subnet-yyy,SecurityGroupIds=sg-zzz \
  --environment Variables="{REDIS_HOST=your-redis-endpoint.cache.amazonaws.com,REDIS_PORT=6379,MAX_USERS=5000,SESSION_TIMEOUT=1800}"
```

#### Lambda Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `REDIS_HOST` | `your-redis.cache.amazonaws.com` | Redis cluster endpoint |
| `REDIS_PORT` | `6379` | Redis port |
| `MAX_USERS` | `5000` | Maximum concurrent users |
| `SESSION_TIMEOUT` | `1800` | Session timeout in seconds (30 min) |

---

### 3.3 API Gateway

#### Create HTTP API:

```bash
aws apigatewayv2 create-api \
  --name waiting-room-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:REGION:ACCOUNT:function:waiting-room-api
```

#### Configure CORS:

```bash
aws apigatewayv2 update-api \
  --api-id YOUR_API_ID \
  --cors-configuration AllowOrigins="*",AllowMethods="GET,OPTIONS",AllowHeaders="Content-Type"
```

#### API Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/check?session_id=xxx` | GET | Check if user can enter |
| `/enter?session_id=xxx` | GET | Create session and allow entry |
| `/status` | GET | Get current user count |
| `/exit?session_id=xxx` | GET | Remove session |

**Example API URL:**
```
https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/staging
```

---

## Fastly VCL Configuration

### Configuration Path

Navigate to:
```
Magento Admin → Stores → Configuration → Advanced → System 
→ Full Page Cache → Fastly Configuration → Custom VCL Snippets
```

### VCL Snippets

#### 1. Waiting Room Check (recv)

**Name:** `waiting_room_check`  
**Type:** `recv`  
**Priority:** `10`

```vcl
# Skip admin and static assets
if (req.http.host == "admin.dashboard.mywebsite.com") {
  return(pass);
}

# Skip waiting room page itself
if (req.url.path == "/waiting-room-th.html" || req.url.path == "/waiting-room-id.html") {
  return(pass);
}

# Skip API calls
if (req.url.path ~ "^/customer/section/load/") {
  return(pass);
}

# Check for session cookie on main pages
if (req.request == "GET" &&
    req.url.path !~ "^/(admin|static|media|pub/static|pub/media)/" &&
    req.url.path !~ "\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|json|xml)$") {
  
  # Check if session cookie exists
  declare local var.has_session BOOL;
  set var.has_session = false;
  
  if (req.http.Cookie ~ "waiting_room_session=") {
    set var.has_session = true;
  }
  
  # If no session, trigger waiting room
  if (!var.has_session) {
    error 750 "Waiting Room";
  }
}
```

---

#### 2. Waiting Room Redirect (error)

**Name:** `waiting_room_redirect`  
**Type:** `error`  
**Priority:** `10`

```vcl
# Redirect to waiting room based on domain
if (obj.status == 750) {
  set obj.status = 302;
  set obj.response = "Found";
  
  # Check which domain and redirect to appropriate waiting room
  if (req.http.host ~ "id.mywebsite.com") {
    set obj.http.Location = "https://id.mywebsite.com/waiting-room-id.html?return=" + req.url;
  } else {
    set obj.http.Location = "https://th.mywebsite.com/waiting-room-th.html?return=" + req.url;
  }
  
  set obj.http.Content-Type = "text/html; charset=utf-8";
  return(deliver);
}
```

---

#### 3. Cache Waiting Room Pages (recv)

**Name:** `cache_waiting_room`  
**Type:** `recv`  
**Priority:** `5`

```vcl
# Cache both waiting room pages at Fastly edge
if (req.url.path == "/waiting-room-th.html" || req.url.path == "/waiting-room-id.html") {
  unset req.http.Cookie;
  set req.http.X-Pass-Authorization = "1";
  return(lookup);
}
```

---

#### 4. Noindex Waiting Room (deliver)

**Name:** `noindex_waiting_room`  
**Type:** `deliver`  
**Priority:** `10`

```vcl
# Prevent search engines from indexing waiting room pages
if (req.url.path == "/waiting-room-th.html" || req.url.path == "/waiting-room-id.html") {
  set resp.http.X-Robots-Tag = "noindex, nofollow";
}
```

---

## Waiting Room HTML Implementation

### Deployment Options

#### Option 1: Deploy to Magento pub/ directory (Recommended)

```bash
# Via Git
cd /path/to/magento/project
cp waiting-room-th.html pub/
cp waiting-room-id.html pub/
git add pub/waiting-room-*.html
git commit -m "Add waiting room pages"
git push origin master
```

#### Option 2: Upload to pub/media/ (If pub/ is read-only)

```bash
scp waiting-room-th.html user@ssh.magento.cloud:pub/media/
scp waiting-room-id.html user@ssh.magento.cloud:pub/media/
```

Then update VCL redirect to `/media/waiting-room-th.html`

---

### Waiting Room HTML Template

**File:** `waiting-room-th.html` (and `waiting-room-id.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="googlebot" content="noindex, nofollow">
    <title>Waiting Room - H&M</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 60px 40px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .logo { width: 120px; height: auto; margin-bottom: 30px; }
        h1 { font-size: 3em; margin-bottom: 20px; font-weight: 700; }
        .status { font-size: 1.3em; margin: 30px 0; opacity: 0.9; }
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 30px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error { color: #ffeb3b; margin-top: 20px; font-size: 0.9em; }
        .info { font-size: 0.9em; opacity: 0.8; margin-top: 30px; }
        .queue-info {
            background: rgba(255, 255, 255, 0.15);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .queue-number { font-size: 2em; font-weight: bold; margin: 10px 0; color: #ff6b6b; }
    </style>
</head>
<body>
    <div class="container">
        <svg class="logo" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="35" font-family="Arial Black" font-size="40" fill="white" font-weight="bold">H&M</text>
        </svg>
        <h1>Waiting Room</h1>
        <div class="status" id="status">Checking availability...</div>
        <div class="spinner" id="spinner"></div>
        <div class="queue-info" id="queueInfo" style="display:none;">
            <div>Current visitors</div>
            <div class="queue-number" id="currentUsers">-</div>
            <div>Available slots: <span id="availableSlots">-</span></div>
        </div>
        <div class="error" id="error"></div>
        <div class="info">Please keep this page open. You will be redirected automatically.</div>
    </div>

    <script>
        // Configuration - UPDATE THIS WITH YOUR API GATEWAY URL
        const API_URL = 'https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/staging';
        const RETRY_INTERVAL = 5000; // 5 seconds
        
        // Detect domain and return URL
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return') || '/';
        const currentDomain = window.location.hostname;
        
        // Generate or get session ID
        let sessionId = getCookie('waiting_room_session') || generateSessionId();
        
        function generateSessionId() {
            return 'wr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        }
        
        function setCookie(name, value, days) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = name + '=' + value + '; expires=' + expires + '; path=/; SameSite=None; Secure';
        }
        
        async function checkAccess() {
            try {
                const response = await fetch(`${API_URL}/check?session_id=${sessionId}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                document.getElementById('currentUsers').textContent = data.current_users || 0;
                document.getElementById('availableSlots').textContent = data.available_slots || 0;
                document.getElementById('queueInfo').style.display = 'block';
                
                if (data.allowed && data.action === 'allow') {
                    document.getElementById('status').textContent = 'Access granted! Entering...';
                    await enterSession();
                } else {
                    document.getElementById('status').textContent = 'Waiting for available slot...';
                    document.getElementById('error').textContent = `Queue: ${data.current_users}/${data.max_users}`;
                    setTimeout(checkAccess, RETRY_INTERVAL);
                }
            } catch (error) {
                console.error('Check failed:', error);
                document.getElementById('status').textContent = 'Checking availability...';
                document.getElementById('error').textContent = '⚠️ Connection issue. Retrying...';
                setTimeout(checkAccess, RETRY_INTERVAL);
            }
        }
        
        async function enterSession() {
            try {
                const response = await fetch(`${API_URL}/enter?session_id=${sessionId}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const data = await response.json();
                if (data.success) {
                    setCookie('waiting_room_session', sessionId, 1);
                    document.getElementById('status').textContent = '✓ Redirecting to site...';
                    document.getElementById('spinner').style.display = 'none';
                    
                    setTimeout(() => {
                        window.location.href = 'https://' + currentDomain + returnUrl;
                    }, 2000);
                } else {
                    document.getElementById('status').textContent = 'Site is full. Retrying...';
                    setTimeout(checkAccess, RETRY_INTERVAL);
                }
            } catch (error) {
                console.error('Enter failed:', error);
                document.getElementById('error').textContent = '⚠️ Failed to enter. Retrying...';
                setTimeout(checkAccess, RETRY_INTERVAL);
            }
        }
        
        // Start checking
        checkAccess();
    </script>
</body>
</html>
```

**Important:** Update the `API_URL` constant with your actual API Gateway URL.

---

Screenshot Reference for AWS Configure

# lambda-environment-variables
![lambda-api-gateway-configuration](https://private-user-images.githubusercontent.com/17334109/523919172-25c4def7-224f-45da-b8e3-7703f24ca64e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjUyMjEzMjUsIm5iZiI6MTc2NTIyMTAyNSwicGF0aCI6Ii8xNzMzNDEwOS81MjM5MTkxNzItMjVjNGRlZjctMjI0Zi00NWRhLWI4ZTMtNzcwM2YyNGNhNjRlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMDglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjA4VDE5MTAyNVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTVhYmY3OGYzN2Y5MGQ4NjhjODZkODgwMjFjMmYyMDVjOTUwMDQyNzU3OGYxMjhiMGVjYjhhZTE0ODVkNGVlMDgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0._PvLWA6vGXqdM4s_BjGEYRfwX-nIm_Zqn4S4zv5q-O8)

# lambda-codebase
![lambda-codebase](https://private-user-images.githubusercontent.com/17334109/523919042-9c7c40da-30ec-4901-86bd-09a8a838853b.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjUyMjEzODQsIm5iZiI6MTc2NTIyMTA4NCwicGF0aCI6Ii8xNzMzNDEwOS81MjM5MTkwNDItOWM3YzQwZGEtMzBlYy00OTAxLTg2YmQtMDlhOGE4Mzg4NTNiLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMDglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjA4VDE5MTEyNFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWY3ZjM2MTBkYzViZmNjODUyNTFmY2RhNjk1NTRlNDJjMWIwZDI2NTkzZThkM2E4MWZiYmU5YWU2YzFhOTBlZjMmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.ixdBe04XxvyHyR7IKN3bEGYxaEHbPlTflZO_JJbDCSI)

# redis-configuration
![redis-configuration](https://private-user-images.githubusercontent.com/17334109/523918869-e153eb51-e7de-4a8c-95dc-301f157f27b4.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjUyMjE0NzAsIm5iZiI6MTc2NTIyMTE3MCwicGF0aCI6Ii8xNzMzNDEwOS81MjM5MTg4NjktZTE1M2ViNTEtZTdkZS00YThjLTk1ZGMtMzAxZjE1N2YyN2I0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMDglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjA4VDE5MTI1MFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTNiMjQ4NTc4MjQ0ZDhhMjY4NDY3OTJiZGY2N2JjMGU0YzAzZmQyYzcyNjc4MTU1MThjZjEyZDFiMWI3NjY2MmMmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.NhM1s5n0ruzaGcZX6DRAhwUvU1Y9E5q6YH_OGBSPBNo)

# lambda-api-gateway-configuration
![lambda-api-gateway-configuration](https://private-user-images.githubusercontent.com/17334109/523917888-c24b1459-88ac-474c-b9fd-bb6045a4403e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjUyMjE1MzYsIm5iZiI6MTc2NTIyMTIzNiwicGF0aCI6Ii8xNzMzNDEwOS81MjM5MTc4ODgtYzI0YjE0NTktODhhYy00NzRjLWI5ZmQtYmI2MDQ1YTQ0MDNlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTEyMDglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMjA4VDE5MTM1NlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTdkNjgzNGE2MDFkYjgyNjEyYjVjNTk0MDBiOGNjZjgwYmMzOGVmZTM2YTU1OGY1MDE4Yjg2NTBjM2Q2M2JhMWYmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.Ezx3q6H-eEe5UStbm78pluMsHkYdQlts7hrDAe5HUV0)

## Testing & Validation

### Postman API Testing

#### Test Collection:

**1. Health Check**
```
GET https://your-api-gateway-url/health
```
Expected Response:
```json
{
  "status": "healthy",
  "redis": "connected"
}
```

---

**2. Check Access**
```
GET https://your-api-gateway-url/check?session_id=test123
```
Expected Response:
```json
{
  "allowed": true,
  "action": "allow",
  "current_users": 0,
  "max_users": 5000,
  "available_slots": 5000
}
```

---

**3. Enter Session**
```
GET https://your-api-gateway-url/enter?session_id=test123
```
Expected Response:
```json
{
  "success": true,
  "message": "Session created",
  "session_id": "test123",
  "expires_in": 1800
}
```

---

**4. Get Status**
```
GET https://your-api-gateway-url/status
```
Expected Response:
```json
{
  "current_users": 1,
  "max_users": 5000,
  "available_slots": 4999
}
```

---

**5. Exit Session**
```
GET https://your-api-gateway-url/exit?session_id=test123
```
Expected Response:
```json
{
  "success": true,
  "message": "Session removed"
}
```

---

### Browser Testing

#### Test Scenario 1: First Visit (No Cookie)
1. Open incognito browser
2. Visit `https://th.mywebsite.com/th_en`
3. **Expected:** Redirected to waiting room
4. **Expected:** After a few seconds, redirected back to site
5. **Expected:** Cookie `waiting_room_session` is set

#### Test Scenario 2: Return Visit (With Cookie)
1. Visit `https://th.mywebsite.com/th_en` again
2. **Expected:** Direct access, no waiting room

#### Test Scenario 3: Site Full
1. Set `MAX_USERS=0` in Lambda environment
2. Visit site in incognito
3. **Expected:** Stuck in waiting room with "Site is full" message

#### Test Scenario 4: Multi-Store
1. Visit `https://id.mywebsite.com/id_en`
2. **Expected:** Redirected to `waiting-room-id.html`
3. **Expected:** Redirected back to Indonesia store

---

## Deployment Checklist

### AWS Setup:
- [ ] Create ElastiCache Redis cluster
- [ ] Note Redis endpoint
- [ ] Create Lambda function with VPC access
- [ ] Upload Lambda deployment package
- [ ] Set environment variables (REDIS_HOST, MAX_USERS, etc.)
- [ ] Configure Lambda timeout (30s) and memory (512MB)
- [ ] Create API Gateway HTTP API
- [ ] Configure CORS on API Gateway
- [ ] Test all API endpoints with Postman
- [ ] Note API Gateway URL

### Fastly Setup:
- [ ] Create VCL snippet: `waiting_room_check` (recv, priority 10)
- [ ] Create VCL snippet: `waiting_room_redirect` (error, priority 10)
- [ ] Create VCL snippet: `cache_waiting_room` (recv, priority 5)
- [ ] Create VCL snippet: `noindex_waiting_room` (deliver, priority 10)
- [ ] Validate VCL syntax
- [ ] Activate new VCL version
- [ ] Test with incognito browser

### Magento Setup:
- [ ] Update waiting room HTML with correct API_URL
- [ ] Upload `waiting-room-th.html` to pub/
- [ ] Upload `waiting-room-id.html` to pub/
- [ ] Verify files are accessible via browser
- [ ] Update robots.txt with Disallow rules
- [ ] Test both store views (TH and ID)

### Monitoring:
- [ ] Set up CloudWatch alarms for Lambda errors
- [ ] Monitor Redis memory usage
- [ ] Track API Gateway 5xx errors
- [ ] Monitor Fastly cache hit ratio
- [ ] Set up alerts for high traffic

### Final Validation:
- [ ] Test first visit (no cookie) → waiting room → redirect
- [ ] Test return visit (with cookie) → direct access
- [ ] Test both domains (th.mywebsite.com and id.mywebsite.com)
- [ ] Test with MAX_USERS=0 → stuck in waiting room
- [ ] Verify cookies are set correctly
- [ ] Check robots.txt is blocking waiting room pages
- [ ] Verify X-Robots-Tag header is present

---

## Troubleshooting

### Issue: Lambda timeout errors
**Symptoms:** API returns 504 Gateway Timeout

**Solutions:**
1. Increase Lambda timeout to 30 seconds
2. Check VPC configuration - Lambda must be in same VPC as Redis
3. Verify Security Group allows outbound to Redis port 6379
4. Check NAT Gateway is configured for Lambda subnets

---

### Issue: Redis connection failed
**Symptoms:** Lambda logs show "Redis Client Error"

**Solutions:**
1. Verify Redis endpoint is correct in Lambda environment variables
2. Check Security Group rules:
   - Redis SG: Allow inbound 6379 from Lambda SG
   - Lambda SG: Allow outbound 6379 to Redis SG
3. Ensure Lambda and Redis are in same VPC
4. Test Redis connectivity from Lambda:
   ```javascript
   await redisClient.ping();
   ```

---

### Issue: Waiting room stuck on "Checking availability"
**Symptoms:** Waiting room page shows spinner forever

**Solutions:**
1. Check browser console for CORS errors
2. Verify API Gateway URL is correct in HTML
3. Check CORS configuration in API Gateway
4. Verify Lambda is returning correct CORS headers
5. Test API endpoint directly with curl:
   ```bash
   curl https://your-api-gateway-url/check?session_id=test
   ```

---

### Issue: All users see waiting room
**Symptoms:** Even with low traffic, everyone is blocked

**Solutions:**
1. Check `MAX_USERS` environment variable in Lambda
2. Verify Redis is not full (check memory usage)
3. Check session timeout - sessions might not be expiring
4. Clear Redis manually:
   ```bash
   redis-cli -h your-redis-endpoint FLUSHALL
   ```

---

### Issue: Cookie not being set
**Symptoms:** Users redirected to waiting room on every visit

**Solutions:**
1. Verify site uses HTTPS (required for Secure cookies)
2. Check cookie attributes: `SameSite=None; Secure`
3. Verify domain matches (no subdomain mismatch)
4. Check browser console for cookie warnings
5. Test cookie manually:
   ```javascript
   document.cookie = "waiting_room_session=test; path=/; SameSite=None; Secure";
   ```

---

### Issue: Waiting room indexed by Google
**Symptoms:** Waiting room pages appear in search results

**Solutions:**
1. Verify robots.txt contains:
   ```
   Disallow: /waiting-room-th.html
   Disallow: /waiting-room-id.html
   ```
2. Check `X-Robots-Tag` header is present:
   ```bash
   curl -I https://th.mywebsite.com/waiting-room-th.html | grep X-Robots-Tag
   ```
3. Submit removal request in Google Search Console
4. Wait 24-48 hours for Google to re-crawl

---

### Issue: VCL syntax error
**Symptoms:** Fastly shows "Error 750" or VCL validation fails

**Solutions:**
1. Check VCL syntax in Fastly Fiddle: https://fiddle.fastly.dev/
2. Verify snippet type matches subroutine (recv, error, deliver)
3. Check for missing semicolons or braces
4. Validate variable declarations
5. Review Fastly VCL documentation

---

### Issue: High Lambda costs
**Symptoms:** AWS bill is higher than expected

**Solutions:**
1. Reduce Lambda memory if possible (test with 256MB)
2. Optimize Redis queries (use pipelining)
3. Increase session timeout to reduce API calls
4. Enable API Gateway caching (if applicable)
5. Monitor CloudWatch metrics for optimization opportunities

---

## Security Best Practices

### 1. Network Security
- ✅ Use VPC for Lambda and Redis (never public)
- ✅ Restrict Redis access to Lambda security group only
- ✅ Use private subnets for Redis
- ✅ Enable VPC Flow Logs for monitoring
- ✅ Use NAT Gateway for Lambda internet access

### 2. Authentication & Authorization
- ✅ Use IAM roles for Lambda (never access keys)
- ✅ Apply least privilege principle to IAM policies
- ✅ Enable Redis AUTH if available
- ✅ Rotate credentials regularly
- ✅ Use AWS Secrets Manager for sensitive data

### 3. Data Protection
- ✅ Use HTTPS only (enforce in Fastly)
- ✅ Enable encryption at rest for Redis
- ✅ Enable encryption in transit for Redis
- ✅ Set secure cookie attributes: `Secure; SameSite=None`
- ✅ Don't log sensitive data (session IDs, cookies)

### 4. Monitoring & Logging
- ✅ Enable CloudWatch Logs for Lambda
- ✅ Set up CloudWatch Alarms for errors
- ✅ Monitor Redis memory and CPU usage
- ✅ Track API Gateway metrics (latency, errors)
- ✅ Enable AWS CloudTrail for audit logs

### 5. Rate Limiting & DDoS Protection
- ✅ Enable rate limiting on API Gateway
- ✅ Use Fastly's DDoS protection
- ✅ Set Lambda reserved concurrency limits
- ✅ Monitor for unusual traffic patterns
- ✅ Implement IP-based throttling if needed

### 6. Code Security
- ✅ Keep dependencies updated (npm audit)
- ✅ Use environment variables for configuration
- ✅ Validate all input parameters
- ✅ Handle errors gracefully (don't expose internals)
- ✅ Use try-catch blocks for all async operations

### 7. Compliance
- ✅ Document data retention policies
- ✅ Implement GDPR compliance (if applicable)
- ✅ Regular security audits
- ✅ Penetration testing before production
- ✅ Incident response plan

---

## Monitoring & Maintenance

### CloudWatch Metrics to Monitor

#### Lambda Metrics:
- **Invocations** - Total API calls
- **Errors** - Failed requests
- **Duration** - Response time
- **Throttles** - Rate limiting events
- **Concurrent Executions** - Active Lambda instances

#### Redis Metrics:
- **CPUUtilization** - Should stay < 80%
- **DatabaseMemoryUsagePercentage** - Should stay < 90%
- **NetworkBytesIn/Out** - Traffic volume
- **CurrConnections** - Active connections
- **Evictions** - Memory pressure indicator

#### API Gateway Metrics:
- **Count** - Total requests
- **4XXError** - Client errors
- **5XXError** - Server errors
- **Latency** - Response time
- **IntegrationLatency** - Lambda execution time

---

### Recommended CloudWatch Alarms

```bash
# Lambda Error Rate > 5%
aws cloudwatch put-metric-alarm \
  --alarm-name waiting-room-lambda-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Redis Memory > 90%
aws cloudwatch put-metric-alarm \
  --alarm-name waiting-room-redis-memory \
  --metric-name DatabaseMemoryUsagePercentage \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold

# API Gateway 5XX Errors
aws cloudwatch put-metric-alarm \
  --alarm-name waiting-room-api-errors \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

---

### Maintenance Tasks

#### Daily:
- [ ] Check CloudWatch dashboard for anomalies
- [ ] Review Lambda error logs
- [ ] Monitor Redis memory usage
- [ ] Verify API Gateway health

#### Weekly:
- [ ] Review cost reports
- [ ] Analyze traffic patterns
- [ ] Check for Lambda cold starts
- [ ] Review security group rules

#### Monthly:
- [ ] Update Lambda dependencies (npm update)
- [ ] Review and optimize Lambda memory/timeout
- [ ] Analyze Redis performance metrics
- [ ] Review and update documentation
- [ ] Test disaster recovery procedures

#### Quarterly:
- [ ] Security audit
- [ ] Load testing
- [ ] Review and update MAX_USERS threshold
- [ ] Evaluate cost optimization opportunities
- [ ] Update runbooks and procedures

---

### Scaling Considerations

#### When to Scale Up:

**Redis:**
- Memory usage consistently > 80%
- CPU usage > 70%
- Latency > 10ms

**Lambda:**
- Throttling errors occurring
- Duration approaching timeout
- Concurrent executions > 80% of limit

**API Gateway:**
- Latency > 500ms
- 5XX errors increasing
- Rate limiting triggered

#### Scaling Options:

**Redis:**
- Upgrade to larger instance type
- Enable Multi-AZ for high availability
- Add read replicas (if using cluster mode)

**Lambda:**
- Increase memory (also increases CPU)
- Increase reserved concurrency
- Optimize code for faster execution

**API Gateway:**
- Enable caching (if applicable)
- Increase throttling limits
- Use CloudFront in front of API Gateway

---

## Support & Resources

### Official Documentation:
- [Fastly VCL Documentation](https://developer.fastly.com/reference/vcl/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [ElastiCache Redis Documentation](https://docs.aws.amazon.com/elasticache/)
- [Adobe Commerce Fastly Module](https://experienceleague.adobe.com/docs/commerce-cloud-service/user-guide/cdn/fastly.html)

### Community Resources:
- [Fastly Community Forum](https://community.fastly.com/)
- [AWS re:Post](https://repost.aws/)
- [Magento Stack Exchange](https://magento.stackexchange.com/)

### Tools:
- [Fastly Fiddle](https://fiddle.fastly.dev/) - Test VCL online
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis GUI
- [Postman](https://www.postman.com/) - API testing
- [AWS CLI](https://aws.amazon.com/cli/) - AWS management

---

## License

This documentation is provided as-is for educational and implementation purposes.

---

## Contributing

For improvements or corrections, please submit a pull request or open an issue.

---

## Changelog

### Version 1.0.0 (2024-12-02)
- Initial release
- Complete implementation guide
- AWS Lambda + Redis architecture
- Fastly VCL configuration
- Testing and troubleshooting guides

---

**End of Documentation**
