# 📡 IntelliSSH

A secure and user-friendly web app for managing Linux servers with Artifical Intelligence via SSH—right from your browser + SFTP Browser in Terminal.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

Support this project:<br>
[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/c/clusterzx)
[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/bech0r)
[![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/clusterzx)
[![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/clusterzx)

![preview](https://github.com/clusterzx/intellissh/blob/master/preview.gif)

## IMPORTANT INFORMATION REGARDING CREDENTIALS:
The default Admin credentials are shown on first startup in the Docker Logs!
Sample:
```
========================================================
INITIAL ADMIN ACCOUNT CREATED
Username: admin
Password: b99c192f24ba9e4f
Please log in and change this password immediately!
========================================================
```

## 🚀 Overview

IntelliSSH helps system administrators and developers access and control remote Linux servers with:

- Browser-based SSH access (via xterm.js)
- Full SFTP Client in Terminal (Download, Upload (Files/Folder), Create Folder, Delete)
- Centralized and secure session management
- Support for password and key-based auth
- Real-time terminal via WebSocket
- AI-powered assistance (OpenAI or Ollama)
- Responsive UI with dark mode

## 🔐 Key Features

- **Authentication**: Secure login with JWT and bcrypt  
- **SSH Sessions**: Create, edit, test, and connect  
- **Terminal**: Full emulation, copy/paste, resize  
- **AI Assistant**: Context-aware help and suggestions  
- **Security**: Encrypted credential storage, rate limiting  
- **Deployment**: Local or Docker-based deployment  

## 🧱 Architecture

```
Frontend (Vue) <--> Backend (Express)
        ↕                 ↕
    WebSocket        SSH2, LLM, DB
```

## ⚡ Quick Start

### 🧪 Development

```bash
git clone https://github.com/clusterzx/intellissh
cd intellissh

# Backend
cd server && npm install && cp .env.example .env && npm run dev

# Frontend (new terminal)
cd client && npm install && npm run dev
```

- **Web**: [http://localhost:8080](http://localhost:8080)  
- **API**: [http://localhost:3000](http://localhost:3000)

---

### 🚀 Production (Docker)

#### Run with port mapping (adjust ports as needed)
```bash
docker run -d -p 8080:3000 --name intellissh clusterzx/intellissh:latest
```

#### Run with volume mounts for persistence
```bash
docker run -d \
  -p 8080:3000 \
  -v $(pwd)/data:/app/server/data \
  --name intellissh \
  clusterzx/intellissh:latest
```

#### Docker Compose

```yaml
services:
  intellissh:
    image: clusterzx/intellissh:latest
    container_name: intellissh
    ports:
      - 8080:3000
    volumes:
      # Mount for persistent backend data (SQLite DB, session info, etc.)
      - ./data:/app/server/data
    restart: unless-stopped
```
---

## 📚 Documentation

- **API**: REST endpoints for auth, sessions, and settings  
- **WebSocket**: Real-time terminal and LLM communication  
- **Usage**: Add SSH sessions, connect, manage profile, enable AI assistant  

## 🛠 Tech Stack

- Vue 3 + TailwindCSS  
- Express.js + SQLite  
- SSH2, Socket.IO, xterm.js  
- OpenAI / Ollama for AI  
- Docker for deployment  

## 📌 Roadmap Highlights

- SFTP file browser ✅
- Activity logging  ⏳
- Multi-user session sharing  ⏳
- Bulk operations & SSH key manager  ⏳
- i18n and mobile apps  ⏳

## 🤝 Contributing

We welcome contributions! Please fork the repo, create a branch, and submit a PR.

## 🛡️ License

MIT License — see [LICENSE](./LICENSE) for details.

---

> **Note**: IntelliSSH handles SSH credentials—secure your deployment appropriately.
