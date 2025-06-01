# 📡 IntelliSSH

A secure and user-friendly web app for managing Linux servers via SSH—right from your browser.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)

## 🚀 Overview

IntelliSSH helps system administrators and developers access and control remote Linux servers with:

- Browser-based SSH access (via xterm.js)
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

### Development

```bash
git clone <repo>
cd webssh-control

# Backend
cd server && npm install && cp .env.example .env && npm run dev

# Frontend (new terminal)
cd client && npm install && npm run dev
```

- Web: http://localhost:8080  
- API: http://localhost:3000  

### Production (Docker)

```bash
docker-compose up -d
```

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

- SFTP file browser  
- Activity logging  
- Multi-user session sharing  
- Bulk operations & SSH key manager  
- i18n and mobile apps  

## 🤝 Contributing

We welcome contributions! Please fork the repo, create a branch, and submit a PR.

## 🛡️ License

ISC License — see [LICENSE](./LICENSE) for details.

---

> **Note**: IntelliSSH handles SSH credentials—secure your deployment appropriately.
