# Étape 1 : Build de l'application React
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
# Copie des logos officiels depuis le dossier racine /logo
COPY logo/ ./public/logo/

RUN npm run build

# Étape 2 : Serveur de production Nginx
FROM nginx:stable-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
