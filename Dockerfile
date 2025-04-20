# Étape 1 : Build de l'application React avec Vite
FROM node:20 AS builder

WORKDIR /app

COPY ./seat-viewer .

RUN npm install
RUN npm run build

# Étape 2 : Serve avec Caddy
FROM caddy:latest

# Copie le build dans le dossier statique de Caddy
COPY --from=builder /app/dist /srv

# Copie la config Caddy (si nécessaire)
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 8080