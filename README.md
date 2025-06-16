<p align="center"> <img src="https://www.wiredoor.net/images/wiredoor.svg" alt="Wiredoor logo" width="60" /> </p>

<h1 align="center" style="color:#1c398e">
  Wiredoor
</h1>

<p align="center">
  <strong>Expose private services securely through reverse VPN tunnel powered by WireGuard and NGINX.</strong><br />
  Open-source | Self-hosted
</p>

<p align="center">
  <a href="https://www.wiredoor.net/docs">Documentation</a> •
  <a href="https://github.com/wiredoor/wiredoor">Core Server</a> •
  <a href="https://github.com/wiredoor/wiredoor-cli">CLI</a> •
  <a href="https://charts.wiredoor.net">Helm Charts</a>
</p>

---

# What is Wiredoor?

**Wiredoor** is a self-hosted, open-source ingress-as-a-service platform that allows you to expose applications and services running in private or local networks to the internet—securely, reliably, and without complex infrastructure.

It uses reverse VPN connections powered by [WireGuard](https://www.wireguard.com) and exposes services through a built-in [NGINX](https://nginx.org) reverse proxy. Perfect for developers, operators, or teams that want full control of their ingress without relying on public cloud solutions.

---

## Features

- **Secure VPN tunnel** with WireGuard (low latency and high performance)
- **Reverse proxy** with NGINX
- **OAuth2-based Authentication** support per domain and service (Google, GitHub, etc.) with [OAuth2-proxy](https://github.com/oauth2-proxy/oauth2-proxy)
- **Automatic SSL certificates** via Let's Encrypt (or self-signed fallback)
- **Websocket Support** Wiredoor supports WebSocket connections out of the box.
- **Web UI** to manage nodes, services, and domains
- **Multi-environment support**: works with Kubernetes, Docker, legacy servers, IoT, etc.
- **CLI client** (`wiredoor-cli`) for service management and automation
- **Gateway nodes** for full subnetwork exposure (site-to-site style)
- 100% **self-hosted and open source**

---

## Quickstart

**Wiredoor Server is the entry point for all external traffic.**  
This means that the server's public IP address or domain **must be accessible from the internet**,  
or at least from the network where you want to access the exposed services.

Wiredoor is designed to run on a publicly reachable host so it can securely receive inbound traffic and forward it to your internal services over a private VPN tunnel.

This guide will help you get Wiredoor running and expose your first private service to the internet in just a few steps.

### Requirements

- Linux VPS (recommended)
- Docker Engine or Docker Desktop
- Open ports: `80`, `443`, and a UDP port for the VPN (default `51820`)
- Optional: Port range for exposing TCP services (e.g. `32760-32767`)

## Deploy Wiredoor Server to your remote server

### Clone Wiredoor Docker Setup

```bash
git clone https://github.com/wiredoor/docker-setup.git
cd docker-setup
```

### Configure environment variables

```bash
cp .env.example .env
nano .env
```

Set your admin email, password, VPN public hostname or IP, and optionally, the TCP port range.
If you modify the TCP port range, make sure to update the `ports:` section in `docker-compose.yml`.

### Start Wiredoor Server

```bash
docker compose up -d
```

### Log in to the Wiredoor web UI

In your browser, Navigate to `https://your_wiredoor_domain_or_ip`. Use the admin credentials from your `.env` file to access the dashboard.

For more information on using the web UI, visit the [Usage Guide](https://www.wiredoor.net/docs/usage)

---

## Configure Wiredoor CLI on your private node

### Install Wiredoor CLI

You can use the auto-installer:

```bash
curl -s https://www.wiredoor.net/install-wiredoor-cli.sh | sh
```

Or download a package from [GitHub Releases](https://github.com/wiredoor/wiredoor-cli/releases).

### Login and register node using `wiredoor-cli`

Run the following on the device you want to connect:

```bash
wiredoor login --url=https://your_deployed_wiredoor_domain_or_ip
```

This will:

- Prompt for admin credentials (email and password)
- Ask for a name for the node (default: current hostname)
- Register the node in the server
- Connect it automatically via WireGuard

---

## Expose your first service

If you have a service running locally (e.g. on port 3000), you can expose it:

```bash
wiredoor http myapp --domain app.your.domain.com --port 3000
```

⚠️ The domain `app.your.domain.com` must point to the public Wiredoor server's IP address.

### Other integrations

- ✅ [Docker Gateway](https://www.wiredoor.net/docs/docker-gateway): Lightweight sidecar container to expose services in Compose environments.
- ✅ [Kubernetes Gateway Chart](https://www.wiredoor.net/docs/kubernetes-gateway): Helm chart to expose any service inside your Kubernetes cluster.

## Domains & Certificates

- Supports public domains with Let's Encrypt SSL.
- Also works with local/internal domains using self-signed certificates.
- Automatically handles renewal and configuration.

## Use Cases

- Expose internal apps without opening firewall ports
- Access Kubernetes dashboards securely from the outside
- Remotely monitor or control IoT / industrial devices
- Replace complex VPN setups with a simpler alternative

---

### 🛠️ Coming soon

More documentation, production setup examples, and deployment tools are on the way!
