# Git workflow — Desktop ↔ Laptop

Use this when you switch devices so all code changes are in Git and stay in sync.

## Push from current device (e.g. Desktop)

Do this **before** switching to the other device.

```powershell
# 1. Backend
cd "d:\CSR STUDIO\csr-studio-backend"
git add .
git status
git commit -m "Your message"
git push origin main

# 2. Frontend (this repo)
cd "d:\CSR STUDIO\csr-studio-frontend"
git add .
git status
git commit -m "Your message"
git push origin main
```

## Update on the other device (e.g. Laptop)

Do this **after** you sit at the other device to get the latest code.

```powershell
# 1. Backend
cd "path\to\CSR STUDIO\csr-studio-backend"
git pull origin main
pnpm install   # only if package.json or lockfile changed

# 2. Frontend (this repo)
cd "path\to\CSR STUDIO\csr-studio-frontend"
git pull origin main
pnpm install   # only if package.json or lockfile changed
```

## Repos on GitHub

- **Backend:** https://github.com/vishwajeetpandey681-tech/csr-studio-backend.git
- **Frontend:** https://github.com/vishwajeetpandey681-tech/csr-studio-frontend.git
