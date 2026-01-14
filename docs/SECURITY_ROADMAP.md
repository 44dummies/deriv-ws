# TraderMind Security Roadmap

**Last Updated**: January 14, 2026  
**Owner**: Security Team  
**Status**: Active Development

---

## ✅ Short-Term Improvements (Completed)

### 1. Rate Limiting ✅
**Status**: Implemented  
**Completion Date**: January 14, 2026

#### Implementation Details
- **Global Rate Limiter**: 100 requests/minute per IP
- **Auth Rate Limiter**: 10 attempts per 15 minutes
- **Trade Rate Limiter**: 5 trades per minute per user
- **Technology**: Redis-backed with in-memory fallback
- **Location**: `backend/api-gateway/src/middleware/rateLimiter.ts`

#### Endpoints Protected
```typescript
// Global: All API endpoints (100 req/min)
app.use(rateLimiter);

// Auth: Login, OAuth callbacks (10 req/15min)
router.post('/auth/*', authRateLimiter);

// Trades: Execute endpoint (5 trades/min)
router.post('/trades/execute', tradeRateLimiter);
```

#### Monitoring
- Rate limit headers added: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 responses logged to Sentry
- Redis connection fallback to in-memory store

---

### 2. Content Security Policy (CSP) Headers ✅
**Status**: Enhanced  
**Completion Date**: January 14, 2026

#### CSP Directives Implemented
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"], // WebSocket + API
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [] // Force HTTPS in production
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
```

#### Known Limitations
- `'unsafe-inline'` in `scriptSrc` and `styleSrc` — Required for React inline styles
  - **Mitigation**: Plan to move to CSS-in-JS with nonce-based CSP
  - **Target**: Q2 2026

---

### 3. Input Validation with Zod ✅
**Status**: Implemented  
**Completion Date**: January 14, 2026

#### Validation Schemas
All critical endpoints now validate input with Zod:

| Endpoint | Schema | Validation Rules |
|----------|--------|------------------|
| `POST /trades/execute` | `executeTradeSchema` | Market format, stake (1-10000), duration (1-1440) |
| `POST /sessions` | `createSessionSchema` | Risk profile enum, max stake, trade limits |
| `PUT /sessions/:id` | `updateSessionSchema` | Status enum, config constraints |
| `POST /auth/switch-account` | `switchAccountSchema` | Account ID format (max 50 chars) |
| `GET /trades`, `/sessions` | `paginationSchema` | Limit (1-100), offset (≥0) |

#### Example Usage
```typescript
import { validateTradeExecution } from '../middleware/validation.js';

router.post('/execute', 
  requireAuth, 
  tradeRateLimiter, 
  validateTradeExecution, // ← Zod validation
  async (req, res) => {
    // req.body is guaranteed valid here
    const { market, stake, duration } = req.body;
    // ...
  }
);
```

#### Error Response Format
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "stake",
      "message": "Stake must be at least 1",
      "code": "too_small"
    }
  ]
}
```

---

## 🚧 Medium-Term Goals (Next 3-6 Months)

### 1. Penetration Testing
**Priority**: HIGH  
**Target Date**: Q2 2026  
**Budget**: $15,000 - $25,000

#### Scope
- **Black Box Testing**: External attack surface (API Gateway, frontend)
- **Gray Box Testing**: Authenticated user privilege escalation
- **Infrastructure Testing**: AWS/Railway deployment, Redis, Supabase
- **Social Engineering**: Phishing simulation (optional)

#### Recommended Vendors
1. **Cobalt.io** — Pentesting-as-a-Service ($5k-$10k)
2. **Synack** — Crowdsourced testing ($10k-$20k)
3. **HackerOne** — Bug bounty platform (pay-per-vuln)

#### Deliverables
- Executive summary report
- CVSS-scored vulnerability list
- Remediation recommendations
- Re-test after fixes

#### Success Criteria
- No CRITICAL or HIGH findings after remediation
- OWASP Top 10 compliance verified
- PCI DSS-ready (if processing payments in future)

---

### 2. SAST/DAST Integration
**Priority**: MEDIUM  
**Target Date**: Q2 2026  
**Estimated Cost**: $500-$2000/month

#### Static Application Security Testing (SAST)

**Tool Options**:
1. **Snyk** (Recommended)
   - Free tier: 200 scans/month
   - Paid: $52/dev/month
   - Features: Dependency scanning, container scanning, IaC scanning
   - GitHub Actions integration

2. **Semgrep** (Alternative)
   - Free: Open-source rules
   - Paid: $30/dev/month (Semgrep Cloud)
   - Custom rule creation for TypeScript/React

3. **SonarQube** (Self-hosted)
   - Free: Community Edition
   - Paid: Developer Edition ($150/year)
   - Deep code quality + security analysis

**Implementation Plan**:
```yaml
# .github/workflows/sast.yml
name: SAST Security Scan
on: [push, pull_request]
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

#### Dynamic Application Security Testing (DAST)

**Tool Options**:
1. **OWASP ZAP** (Free)
   - Automated scanner
   - CI/CD integration
   - API scanning

2. **Burp Suite Professional** ($449/year)
   - Manual + automated scanning
   - Advanced vulnerability detection

**Implementation**:
- Run nightly DAST scans against staging environment
- Integrate with Sentry for alert routing
- Block deployment on HIGH findings

---

### 3. Secrets Management with Vault
**Priority**: MEDIUM  
**Target Date**: Q3 2026  
**Estimated Cost**: $0 (self-hosted) or $50-$200/month (cloud)

#### Current State
- Secrets stored in `.env` files
- Deriv tokens encrypted at rest (AES-256-GCM)
- Railway/Vercel environment variables (unencrypted in platform)

#### Target Architecture
```
┌─────────────────┐
│  HashiCorp Vault│
│  (Secrets Store)│
└────────┬────────┘
         │
    ┌────┴─────┐
    │ AppRole  │ (API Gateway)
    │ Auth     │
    └────┬─────┘
         │
┌────────▼────────┐
│ API Gateway     │
│ - SUPABASE_URL  │
│ - DERIV_TOKENS  │
│ - JWT_SECRET    │
└─────────────────┘
```

#### Implementation Phases
**Phase 1: Vault Setup (Month 1)**
- Deploy Vault on Railway/AWS
- Configure transit encryption
- Enable audit logging

**Phase 2: Secret Migration (Month 2)**
- Migrate Supabase credentials
- Migrate JWT signing keys
- Implement automatic key rotation

**Phase 3: Token Encryption (Month 3)**
- Use Vault Transit engine for Deriv tokens
- Remove local encryption (delegate to Vault)
- Implement lease renewal

#### Alternative: AWS Secrets Manager
- Fully managed service
- Auto-rotation for RDS/Redis
- $0.40 per secret/month + $0.05 per 10k API calls
- Tighter integration with AWS services

---

## 🔮 Long-Term Goals (6-12 Months)

### 1. SOC 2 Type II Compliance
**Priority**: HIGH (if pursuing enterprise customers)  
**Target Date**: Q4 2026  
**Estimated Cost**: $50,000 - $100,000

#### Prerequisites
1. **Access Controls**
   - Multi-factor authentication (MFA) for admin accounts
   - Role-based access control (RBAC) audit
   - Principle of least privilege enforcement

2. **Change Management**
   - Documented code review process (already in place via GitHub)
   - Deployment approval workflow
   - Rollback procedures

3. **Monitoring & Incident Response**
   - 24/7 logging (Sentry, CloudWatch, Datadog)
   - Incident response runbook
   - Post-mortem documentation

4. **Vendor Management**
   - Security questionnaires for Supabase, Railway, Deriv
   - Data processing agreements (DPA)
   - Third-party risk assessment

#### SOC 2 Trust Service Criteria
| Criterion | Current Status | Gap |
|-----------|----------------|-----|
| **Security** | ✅ RLS, encryption, MFA | Need formal policies |
| **Availability** | ✅ 99.9% uptime | Need SLA documentation |
| **Processing Integrity** | ✅ Immutable audit logs | Need data validation policies |
| **Confidentiality** | ✅ Encrypted tokens | Need data classification |
| **Privacy** | ⚠️ GDPR basics | Need DPO, privacy policy updates |

#### Audit Process
1. **Readiness Assessment** (Month 1-2) — Self-audit, gap analysis
2. **Remediation** (Month 3-6) — Fix control gaps
3. **Formal Audit** (Month 7-9) — Auditor engagement (3-6 months)
4. **Report Issuance** (Month 10-12) — SOC 2 Type II report

#### Recommended Auditors
- **Drata** ($2k-$5k/month) — Automated compliance platform
- **Vanta** ($3k-$8k/month) — Similar to Drata, more enterprise-focused
- **A-LIGN** ($50k+) — Traditional audit firm (if no automation)

---

### 2. Zero-Trust Architecture
**Priority**: MEDIUM  
**Target Date**: Q1 2027  
**Estimated Cost**: Infrastructure + dev time

#### Principles
1. **Never Trust, Always Verify**
   - Every request authenticated (even internal services)
   - Mutual TLS (mTLS) between microservices
   - No implicit trust based on network location

2. **Least Privilege Access**
   - Service accounts with minimal permissions
   - Temporary credentials (Vault dynamic secrets)
   - Just-in-time (JIT) access for admins

3. **Microsegmentation**
   - Network policies isolating services
   - API Gateway ↔ QuantEngine via authenticated channel
   - Redis/Supabase accessible only via VPN/private network

#### Implementation Roadmap

**Phase 1: Service Mesh (Month 1-3)**
- Deploy **Istio** or **Linkerd** for mTLS
- Automatic certificate rotation
- Traffic encryption between pods

**Phase 2: Identity-Aware Proxy (Month 4-6)**
- **Cloudflare Access** or **AWS IAM Identity Center**
- OAuth 2.0 / OIDC for service-to-service auth
- Replace static API keys with short-lived JWTs

**Phase 3: Network Policies (Month 7-9)**
- Kubernetes NetworkPolicies (if migrating to K8s)
- Railway private networking (current platform)
- Deny-all-by-default firewall rules

**Phase 4: Monitoring & Alerting (Month 10-12)**
- Unauthorized access attempt alerts
- Anomaly detection (ML-based)
- Audit log centralization (Splunk, ELK, Datadog)

#### Technology Stack
| Component | Tool | Cost |
|-----------|------|------|
| Service Mesh | Istio | Free (open-source) |
| Identity Provider | Auth0, Okta | $0-$240/month |
| Secrets Management | HashiCorp Vault | Self-hosted (free) |
| Network Security | Cloudflare Zero Trust | $7/user/month |
| SIEM | Splunk Cloud | $150/GB/month |

---

### 3. Advanced Threat Detection
**Priority**: LOW (unless targeted attacks occur)  
**Target Date**: Q2 2027

#### Capabilities
1. **Web Application Firewall (WAF)**
   - Cloudflare WAF (included with Pro plan $20/month)
   - AWS WAF ($5/rule/month + data transfer)
   - ModSecurity (open-source, self-hosted)

2. **DDoS Protection**
   - Cloudflare DDoS mitigation (included)
   - AWS Shield Standard (free) / Advanced ($3k/month)

3. **Bot Detection**
   - Cloudflare Bot Management ($10/10k requests)
   - reCAPTCHA Enterprise ($1/1k assessments)
   - DataDome ($500-$2k/month)

4. **Runtime Application Self-Protection (RASP)**
   - Sqreen (acquired by Datadog)
   - Contrast Security ($2k-$5k/month)
   - Monitors code execution for attacks

#### Threat Intelligence Integration
- **MISP** (Malware Information Sharing Platform)
- **AlienVault OTX** (Open Threat Exchange)
- Automated IP blocklists from known bad actors

---

## 📊 Security Metrics & KPIs

### Current Baseline (January 2026)
| Metric | Value | Target (Q4 2026) |
|--------|-------|------------------|
| **Vulnerabilities (HIGH+)** | 0 | 0 |
| **Mean Time to Patch (MTTP)** | N/A | <7 days |
| **Security Incidents** | 0 | 0 |
| **Failed Login Rate** | N/A | <1% |
| **API Rate Limit Hits** | N/A | <0.1% |
| **CSP Violations** | Unknown | <10/day |
| **JWT Token Leaks** | 0 | 0 |

### Monitoring Tools
- **Sentry**: Error tracking, performance monitoring
- **Datadog** (planned): Infrastructure + APM
- **Snyk** (planned): Dependency vulnerability scanning
- **GitHub Security Alerts**: Enabled on all repos

---

## 🚨 Incident Response Plan

### Severity Levels
| Level | Definition | Response Time |
|-------|------------|---------------|
| **P0 - Critical** | Data breach, service outage | <15 minutes |
| **P1 - High** | Auth bypass, RCE vulnerability | <1 hour |
| **P2 - Medium** | XSS, information disclosure | <24 hours |
| **P3 - Low** | Minor config issues | <7 days |

### Response Workflow
1. **Detection** → Sentry alert, user report, pentest finding
2. **Triage** → Assign severity, create incident ticket
3. **Containment** → Disable affected feature, revoke tokens, isolate service
4. **Eradication** → Patch vulnerability, deploy hotfix
5. **Recovery** → Monitor for anomalies, verify fix
6. **Post-Mortem** → Document in `docs/incidents/`, prevent recurrence

### Communication Plan
- **Internal**: Slack #security-alerts channel
- **External**: Email affected users within 72 hours (GDPR requirement)
- **Public**: Security advisory on GitHub (for severe bugs)

---

## 📚 Security Training & Awareness

### Developer Training (Quarterly)
- **OWASP Top 10** — Web application security fundamentals
- **Secure Coding Practices** — Input validation, SQL injection, XSS prevention
- **Threat Modeling** — STRIDE methodology workshop
- **Cryptography Basics** — When to use hashing vs. encryption

### Annual Security Audit
- External penetration test (see Medium-Term section)
- Internal code review of critical components
- Dependency audit (already automated via pnpm audit)

---

## 🔗 Additional Resources

### Internal Documentation
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) — Initial audit findings (Jan 2026)
- [API_REFERENCE.md](./API_REFERENCE.md) — Endpoint security details
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design with security boundaries

### External Standards
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — Application Security Verification Standard
- [CWE Top 25](https://cwe.mitre.org/top25/) — Most dangerous software weaknesses
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) — Risk management guidelines

### Industry Benchmarks
- **Fintech Security**: PCI DSS Level 1 compliance
- **Trading Platforms**: FCA/SEC regulatory requirements (future)
- **Cloud Security**: CIS Benchmarks for AWS/Azure

---

## ✅ Next Actions (Immediate)

1. **Enable Snyk**: Sign up for free tier, connect GitHub repo (Week 1)
2. **Configure CSP Reporting**: Add `report-uri` directive to capture violations (Week 1)
3. **Deploy OWASP ZAP**: Schedule weekly automated scans (Week 2)
4. **Create Security Training Deck**: Prepare OWASP Top 10 presentation (Week 3)
5. **Schedule Pentest**: Request quotes from 3 vendors (Week 4)

---

**Review Frequency**: Quarterly  
**Stakeholders**: CTO, Engineering Team, Security Consultant (future)  
**Approval**: Pending management sign-off
