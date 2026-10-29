#!/usr/bin/env bash
# ==============================================================================
# HÉPHAÏSTOS - Script d'Administration & Déploiement (Debian / Ubuntu)
# Senior Aerospace Ermeto - Suivi Machine & Atelier
# ==============================================================================
# Usage :
#   ./install.sh              -> Menu interactif
#   ./install.sh install      -> Installation complète (Docker + Ports Auto + App + BDD)
#   ./install.sh update       -> Mise à jour (Backup BDD + Git pull + Rebuild)
#   ./install.sh uninstall    -> Désinstallation propre (Conteneurs, Images, Volumes)
#   ./install.sh status       -> État des conteneurs et santé des services
#   ./install.sh backup       -> Sauvegarde de la base PostgreSQL
#   ./install.sh logs         -> Affichage des journaux en temps réel
# ==============================================================================

set -euo pipefail

# Couleurs d'affichage
BLUE='\033[0;34m'
NAVY='\033[1;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="Hephaistos"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_banner() {
    echo -e "${NAVY}======================================================================${NC}"
    echo -e "${CYAN}   _   _ _____ ____  _   _    _    ___ ____ _____ ___  ____  ${NC}"
    echo -e "${CYAN}  | | | | ____|  _ \| | | |  / \  |_ _/ ___|_   _/ _ \/ ___| ${NC}"
    echo -e "${CYAN}  | |_| |  _| | |_) | |_| | / _ \  | |\___ \ | || | | \___ \ ${NC}"
    echo -e "${CYAN}  |  _  | |___|  __/|  _  |/ ___ \ | | ___) || || |_| |___) |${NC}"
    echo -e "${CYAN}  |_| |_|_____|_|   |_| |_/_/   \_\___|____/ |_| \___/|____/ ${NC}"
    echo -e "${NAVY}  Senior Aerospace Ermeto - Système de Suivi Machine & Atelier (#00305B)${NC}"
    echo -e "${NAVY}======================================================================${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERREUR]${NC} $1"
}

# Vérification des privilèges pour Docker
run_privileged() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        log_error "Ce script nécessite les droits root ou sudo pour installer les paquets système."
        exit 1
    fi
}

# Détection de la commande docker compose
get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# Vérifie si un port est déjà occupé sur la machine hôte (hors conteneurs hephaistos_*)
is_port_in_use() {
    local port="$1"

    # Si le port est déjà utilisé par un de nos propres conteneurs hephaistos_*, il est valide pour nous
    if command -v docker >/dev/null 2>&1; then
        if docker ps --filter "name=^hephaistos_" --format '{{.Ports}}' 2>/dev/null | grep -Eq "(:|0\.0\.0\.0:|:::)${port}->"; then
            return 1
        fi
        # Vérifier si un AUTRE conteneur Docker utilise ce port
        if docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -v "^hephaistos_" | grep -Eq "(:|0\.0\.0\.0:|:::)${port}->"; then
            return 0
        fi
    fi

    # Vérification via ss (standard Debian)
    if command -v ss >/dev/null 2>&1; then
        if ss -tuln 2>/dev/null | awk '{print $5}' | grep -Eq "(:|\.)${port}$"; then
            return 0
        fi
    fi

    # Vérification via lsof ou netstat en fallback
    if command -v lsof >/dev/null 2>&1; then
        if lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | awk '{print $4}' | grep -Eq "(:|\.)${port}$"; then
            return 0
        fi
    fi

    # Test d'ouverture socket bash /dev/tcp en dernier recours
    if (echo >/dev/tcp/127.0.0.1/"${port}") >/dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Trouve automatiquement un port libre à partir d'un port souhaité
find_free_port() {
    local desired_port="$1"
    local candidate="$desired_port"

    while is_port_in_use "$candidate"; do
        if [ "$candidate" -eq 80 ]; then
            candidate=8080
        else
            candidate=$((candidate + 1))
        fi
    done

    echo "$candidate"
}

# Met à jour ou ajoute une variable dans .env
set_env_var() {
    local key="$1"
    local val="$2"
    if grep -q "^${key}=" .env 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${val}|" .env
    else
        echo "${key}=${val}" >> .env
    fi
}

# Vérifie et attribue automatiquement des ports disponibles dans .env
resolve_and_assign_ports() {
    log_info "Vérification de la disponibilité des ports réseau sur le serveur..."

    set -a
    [ -f .env ] && . ./.env
    set +a

    local req_pg_port="${POSTGRES_PORT:-5432}"
    local req_backend_port="${BACKEND_PORT:-8000}"
    local req_app_port="${APP_PORT:-80}"

    # 1. Port PostgreSQL
    local free_pg_port
    free_pg_port=$(find_free_port "$req_pg_port")
    if [ "$free_pg_port" != "$req_pg_port" ]; then
        log_warn "Le port PostgreSQL ${req_pg_port} est déjà occupé -> Attribution automatique du port libre : ${free_pg_port}"
    else
        log_success "Port PostgreSQL disponible : ${free_pg_port}"
    fi
    set_env_var "POSTGRES_PORT" "$free_pg_port"

    # 2. Port Backend FastAPI
    local free_backend_port
    free_backend_port=$(find_free_port "$req_backend_port")
    if [ "$free_backend_port" = "$free_pg_port" ]; then
        free_backend_port=$(find_free_port $((free_backend_port + 1)))
    fi
    if [ "$free_backend_port" != "$req_backend_port" ]; then
        log_warn "Le port Backend ${req_backend_port} est déjà occupé -> Attribution automatique du port libre : ${free_backend_port}"
    else
        log_success "Port Backend FastAPI disponible : ${free_backend_port}"
    fi
    set_env_var "BACKEND_PORT" "$free_backend_port"

    # 3. Port Application Web (Nginx)
    local free_app_port
    free_app_port=$(find_free_port "$req_app_port")
    while [ "$free_app_port" = "$free_pg_port" ] || [ "$free_app_port" = "$free_backend_port" ]; do
        free_app_port=$(find_free_port $((free_app_port + 1)))
    done
    if [ "$free_app_port" != "$req_app_port" ]; then
        log_warn "Le port Web ${req_app_port} est déjà occupé -> Attribution automatique du port libre : ${free_app_port}"
    else
        log_success "Port Web HTTP disponible : ${free_app_port}"
    fi
    set_env_var "APP_PORT" "$free_app_port"
}

# Installation de Docker sur Debian si non présent
ensure_docker_debian() {
    if command -v docker >/dev/null 2>&1 && [ -n "$(get_compose_cmd)" ]; then
        log_success "Docker et Docker Compose sont déjà installés."
        return 0
    fi

    log_info "Installation de Docker et Docker Compose pour Debian/Ubuntu..."
    run_privileged apt-get update -y
    run_privileged apt-get install -y ca-certificates curl gnupg lsb-release git openssl iproute2

    if ! command -v docker >/dev/null 2>&1; then
        run_privileged install -m 0755 -d /etc/apt/keyrings
        DISTRO_ID=$(. /etc/os-release && echo "$ID")
        DISTRO_CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
        curl -fsSL "https://download.docker.com/linux/${DISTRO_ID}/gpg" | run_privileged gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        run_privileged chmod a+r /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO_ID} \
          ${DISTRO_CODENAME} stable" | run_privileged tee /etc/apt/sources.list.d/docker.list > /dev/null

        run_privileged apt-get update -y
        run_privileged apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi

    run_privileged systemctl enable docker
    run_privileged systemctl start docker

    # Ajout de l'utilisateur courant au groupe docker si non root
    if [ "$(id -u)" -ne 0 ] && [ -n "${USER:-}" ]; then
        run_privileged usermod -aG docker "$USER" || true
    fi

    log_success "Docker et Docker Compose ont été installés avec succès."
}

# Création et sécurisation du fichier .env + sélection automatique des ports
setup_env() {
    if [ ! -f ".env" ]; then
        log_info "Génération du fichier de configuration .env..."
        cp .env.example .env

        # Génération de clés aléatoires sécurisées
        RAND_DB_PASS=$(openssl rand -hex 16 2>/dev/null || tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 24)
        RAND_JWT_KEY=$(openssl rand -hex 32 2>/dev/null || tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 48)

        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${RAND_DB_PASS}/" .env
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=${RAND_JWT_KEY}/" .env

        log_success "Fichier .env créé avec des clés cryptographiques uniques."
    else
        log_info "Fichier .env existant détecté."
    fi

    # Toujours vérifier et corriger automatiquement les ports si l'un d'eux est déjà alloué
    resolve_and_assign_ports
}

# Sauvegarde de la base PostgreSQL
do_backup() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -z "$COMPOSE_CMD" ]; then
        log_warn "Docker Compose non détecté, sauvegarde ignorée."
        return 0
    fi

    if docker ps --format '{{.Names}}' | grep -q "^hephaistos_db$"; then
        mkdir -p backups
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="backups/hephaistos_backup_${TIMESTAMP}.sql.gz"
        set -a
        [ -f .env ] && . ./.env
        set +a
        log_info "Création d'une sauvegarde PostgreSQL dans ${BACKUP_FILE}..."
        docker exec hephaistos_db pg_dump -U "${POSTGRES_USER:-hephaistos}" "${POSTGRES_DB:-hephaistos_db}" | gzip > "$BACKUP_FILE"
        log_success "Sauvegarde terminée : ${BACKUP_FILE}"
    else
        log_warn "Le conteneur hephaistos_db n'est pas en cours d'exécution."
    fi
}

# Commande : INSTALL
do_install() {
    print_banner
    log_info "Démarrage de l'installation de HÉPHAÏSTOS..."

    ensure_docker_debian
    setup_env

    # Vérification de la présence du dossier logo
    mkdir -p logo
    if [ -d "logo" ]; then
        mkdir -p frontend/public/logo
        cp -rf logo/* frontend/public/logo/ 2>/dev/null || true
        log_success "Logos Senior Aerospace Ermeto synchronisés."
    fi

    COMPOSE_CMD=$(get_compose_cmd)
    log_info "Construction et lancement des conteneurs Docker..."
    $COMPOSE_CMD up -d --build

    log_info "Attente du démarrage complet des services..."
    sleep 5

    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    set -a
    [ -f .env ] && . ./.env
    set +a

    echo ""
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}  INSTALLATION DE HÉPHAÏSTOS TERMINÉE AVEC SUCCÈS !${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "  🌐 Interface Web        : ${CYAN}http://${SERVER_IP}:${APP_PORT:-80}${NC}"
    echo -e "  📡 API & Swagger Docs   : ${CYAN}http://${SERVER_IP}:${BACKEND_PORT:-8000}/docs${NC}"
    echo -e "  🗄️  Port PostgreSQL Hôte : ${CYAN}${POSTGRES_PORT:-5432}${NC}"
    echo -e "  📱 URL Serveur Android  : ${CYAN}http://${SERVER_IP}:${APP_PORT:-80}${NC}"
    echo -e "  👤 Compte Admin par déf.: ${YELLOW}${FIRST_ADMIN_USERNAME:-admin}${NC}"
    echo -e "  🔑 Mot de passe Admin   : ${YELLOW}${FIRST_ADMIN_PASSWORD:-admin123}${NC}"
    echo -e "${GREEN}======================================================================${NC}"
}

# Commande : UPDATE
do_update() {
    print_banner
    log_info "Démarrage de la mise à jour de HÉPHAÏSTOS..."

    # 1. Sauvegarde de sécurité avant mise à jour
    do_backup

    # 2. Récupération des mises à jour Git si dépôt configuré
    if [ -d ".git" ] && git remote -v | grep -q "origin"; then
        log_info "Récupération des dernières modifications depuis GitHub (git pull)..."
        git pull --ff-only || log_warn "Impossible d'effectuer git pull automatiquement (modifications locales ou branche non suivie)."
    else
        log_info "Pas de dépôt distant configuré, mise à jour à partir des fichiers locaux..."
    fi

    # 3. Synchronisation des logos
    if [ -d "logo" ]; then
        mkdir -p frontend/public/logo
        cp -rf logo/* frontend/public/logo/ 2>/dev/null || true
    fi

    # 4. Vérification automatique des ports avant relance
    setup_env

    # 5. Reconstruction et redémarrage sans perte de données
    COMPOSE_CMD=$(get_compose_cmd)
    log_info "Reconstruction des images Docker et redémarrage des services..."
    $COMPOSE_CMD up -d --build --remove-orphans

    # 6. Nettoyage des anciennes images inutilisées
    docker image prune -f >/dev/null 2>&1 || true

    set -a
    [ -f .env ] && . ./.env
    set +a
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

    log_success "Mise à jour de HÉPHAÏSTOS appliquée avec succès !"
    echo -e "  🌐 Interface Web : ${CYAN}http://${SERVER_IP}:${APP_PORT:-80}${NC}"
}

# Commande : UNINSTALL
do_uninstall() {
    print_banner
    log_warn "Vous êtes sur le point de désinstaller l'application HÉPHAÏSTOS."
    read -r -p "Confirmez-vous l'arrêt et la suppression des conteneurs ? [o/N] : " CONFIRM_UNINSTALL
    if [[ ! "$CONFIRM_UNINSTALL" =~ ^[oOyY]$ ]]; then
        log_info "Désinstallation annulée."
        exit 0
    fi

    COMPOSE_CMD=$(get_compose_cmd)
    if [ -n "$COMPOSE_CMD" ]; then
        read -r -p "Voulez-vous également SUPPRIMER la base de données PostgreSQL (perte définitive des déclarations) ? [o/N] : " CONFIRM_PURGE
        if [[ "$CONFIRM_PURGE" =~ ^[oOyY]$ ]]; then
            log_warn "Suppression des conteneurs, réseaux, images ET volumes de données..."
            $COMPOSE_CMD down -v --rmi local --remove-orphans
            rm -f .env
            log_success "Application et données intégralement supprimées."
        else
            log_info "Création d'une sauvegarde de sécurité avant arrêt..."
            do_backup || true
            log_info "Suppression des conteneurs et images (le volume PostgreSQL hephaistos_pgdata est conservé)..."
            $COMPOSE_CMD down --rmi local --remove-orphans
            log_success "Application désinstallée (vos données PostgreSQL ont été préservées)."
        fi
    else
        log_warn "Docker Compose n'est pas installé."
    fi
}

# Commande : STATUS
do_status() {
    print_banner
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -n "$COMPOSE_CMD" ]; then
        $COMPOSE_CMD ps
        if [ -f .env ]; then
            echo ""
            set -a
            . ./.env
            set +a
            SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
            echo -e "  🌐 Port Web (APP_PORT)          : ${CYAN}http://${SERVER_IP}:${APP_PORT:-80}${NC}"
            echo -e "  📡 Port API (BACKEND_PORT)      : ${CYAN}http://${SERVER_IP}:${BACKEND_PORT:-8000}/docs${NC}"
            echo -e "  🗄️  Port PostgreSQL (POSTGRES_PORT): ${CYAN}${POSTGRES_PORT:-5432}${NC}"
        fi
    else
        log_error "Docker Compose n'est pas installé."
    fi
}

# Commande : LOGS
do_logs() {
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -n "$COMPOSE_CMD" ]; then
        $COMPOSE_CMD logs -f --tail=100
    else
        log_error "Docker Compose n'est pas installé."
    fi
}

# Menu interactif
show_menu() {
    print_banner
    echo "Choisissez une action :"
    echo "  1) Installer Héphaïstos (install)"
    echo "  2) Mettre à jour Héphaïstos (update)"
    echo "  3) Vérifier l'état des services (status)"
    echo "  4) Sauvegarder la base de données (backup)"
    echo "  5) Consulter les journaux en direct (logs)"
    echo "  6) Désinstaller proprement Héphaïstos (uninstall)"
    echo "  0) Quitter"
    echo ""
    read -r -p "Votre choix [0-6] : " MENU_CHOICE
    case "$MENU_CHOICE" in
        1) do_install ;;
        2) do_update ;;
        3) do_status ;;
        4) do_backup ;;
        5) do_logs ;;
        6) do_uninstall ;;
        0) exit 0 ;;
        *) log_error "Choix invalide." ; exit 1 ;;
    esac
}

# Point d'entrée principal
ACTION="${1:-menu}"
case "$ACTION" in
    install)   do_install ;;
    update)    do_update ;;
    uninstall) do_uninstall ;;
    status)    do_status ;;
    backup)    do_backup ;;
    logs)      do_logs ;;
    menu)      show_menu ;;
    *)
        echo "Usage: $0 {install|update|uninstall|status|backup|logs}"
        exit 1
        ;;
esac
