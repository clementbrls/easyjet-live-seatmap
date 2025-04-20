# Utilise l'image officielle de Caddy
FROM caddy:latest

# Copie les fichiers du site statique dans le répertoire par défaut de Caddy
COPY ./seat-viewer/dist/ /srv

# Optionnel : Ajoutez un fichier Caddyfile pour des configurations spécifiques
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 8080
