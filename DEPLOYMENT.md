# Deployment Guide: VPS + Docker + Nginx

This guide explains how to deploy the TraderMind backend `backend/` to a VPS (Hetzner, DigitalOcean, etc.) using Docker and Nginx.

## Architecture
**Traffic Flow:**
```
[Internet]
   ↓ (HTTPS: 443)
[Nginx Container]
   ↓ (Docker Internal Network)
[API Gateway Container :3000]
   ↓ (Docker Internal Network)
[Quant Engine] [AI Layer] [Redis]
```

**Key Concept:**
- Backend services are **NOT** exposed to the host (your VPS public IP).
- They are accessible **ONLY** via the internal Docker network or through Nginx.
- Nginx acts as the single gatekeeper for public traffic.

---

## 1. Prerequisites
- **VPS**: Ubuntu 22.04+ (2GB RAM min recommended).
- **Domain**: Pointed to your VPS IP (A Record).
- **Security**: SSH Key authentication enabled, UFW firewall active (allow 22, 80, 443).

## 2. Server Setup (First Time)
SSH into your server:
```bash
ssh user@your-vps-ip
```

### Install Docker & Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Clone Repository
```bash
git clone <your-repo-url> /opt/tradermind
cd /opt/tradermind
```

---

## 3. Configuration

### Environment Variables (CRITICAL)
Create a `.env` file. **NEVER** copy this file to your frontend or commit it.
```bash
cp .env.example .env
nano .env
```

**Add these Production Variables:**
```ini
# General
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Security
# Set this to your Vercel/Frontend Domain to allow CORS (no trailing slash)
CORS_ORIGIN=https://your-frontend.vercel.app

# Database & Infra
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
REDIS_URL=redis://redis:6379

# Deriv
DERIV_APP_ID=your-app-id

# AI Provider (if used)
# OPENAI_API_KEY=sk-...
```

---

## 4. Run Production Services
Start the stack using the production compose file.
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
*Note: This uses `restart: unless-stopped` to ensure services recover after a reboot.*

### Verify Health
```bash
docker compose -f docker-compose.prod.yml ps
```
All services (`api-gateway`, `quant-engine`, `ai-layer`, `redis`, `nginx`) should be `Up`.

---

## 5. SSL & Nginx (HTTPS)
The provided `nginx.conf` handles basic reverse proxying. To enable HTTPS (Recommended):

1.  **Install Certbot on Host:**
    ```bash
    sudo apt install certbot
    ```
2.  **Generate Certificate:**
    ```bash
    sudo certbot certonly --standalone -d yourdomain.com
    ```
3.  **Update `docker-compose.prod.yml`:**
    Uncomment the certificate volume mount in the `nginx` service:
    ```yaml
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/nginx/certs:ro # Read-only mount
    ```
4.  **Update `nginx.conf`:**
    Uncomment the SSL configuration lines.

**Auto-renewal:** Certbot automatically sets up a cron job on the host. Since Nginx reads the files from the host mount, you just need to reload Nginx occasionally (e.g., cron job `docker compose exec nginx nginx -s reload`).

---

## 6. Frontend Configuration (Vercel)
On your frontend deployment (Vercel/Netlify):

1.  **VITE_API_URL**: Set to `https://your-domain.com` (or `http://your-ip` if testing without SSL).
2.  **Protocol**: Ensure you do not mix Protocols. If Frontend is HTTPS, Backend **MUST** be HTTPS (use SSL steps above).
3.  **CORS**: Ensure the `CORS_ORIGIN` in your backend `.env` matches your Vercel domain exactly.

---

## Troubleshooting

- **Check Logs**: `docker compose -f docker-compose.prod.yml logs -f api-gateway`
- **Network Issues**: Ensure you are NOT running `docker run --network host`. The compose file handles isolation correctly.
- **Port Conflicts**: Ensure no other service (like Apache) is using port 80/443 on the host.
