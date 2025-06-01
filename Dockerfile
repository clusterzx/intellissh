# ---- Build client ----
FROM node:20 AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Build server ----
FROM node:20 AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ .
# (Optional: build step, falls z.B. TypeScript verwendet wird)

# ---- Production image ----
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# Copy server code
COPY --from=server-build /app/server /app/server

# Copy client build to server's public directory (anpassen falls nötig)
COPY --from=client-build /app/client/dist /app/server/public

# Install production dependencies for server
WORKDIR /app/server
RUN apt-get update && apt-get install -y python3 make g++ && npm ci --omit=dev && apt-get remove -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy start script
WORKDIR /app
COPY start.sh .
RUN npm install -g nodemon
RUN npm install -g pm2
RUN chmod +x start.sh

# Expose ports (z.B. 3000 für Server, 5173 für Vite falls benötigt)
EXPOSE 3000

# Start both server and client (Client wird als statische Files vom Server ausgeliefert)
CMD ["bash", "start.sh"]
