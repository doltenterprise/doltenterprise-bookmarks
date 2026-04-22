# Deployment Guide

## Production with PM2
For production environments, it is recommended to use a process manager like **PM2**.

```bash
# Install PM2
npm install pm2 -g

# Start the application
pm2 start app.js --name linkboard

# Or start the binary
pm2 start ./linkboard --name linkboard
```

## Reverse Proxy with Nginx
To serve LinkBoard over HTTPS, use Nginx as a reverse proxy.

```nginx
server {
    listen 80;
    server_name bookmarks.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
