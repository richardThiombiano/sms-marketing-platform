#!/usr/bin/env bash
# ============================================================
# Provisioning d'un VPS OVH pour SMS Marketing Platform
# ------------------------------------------------------------
# Prépare un serveur Debian 12 / Ubuntu 22.04+ fraîchement installé :
#   - Mises à jour système
#   - Installation de Docker + Docker Compose plugin
#   - Pare-feu UFW (SSH, HTTP, HTTPS)
#   - Fuseau horaire + swap (utile sur petits VPS)
#   - Utilisateur de déploiement non-root (optionnel)
#
# À exécuter EN ROOT sur le VPS :
#   sudo bash provision-vps.sh
#
# Idempotent : peut être relancé sans risque.
# ============================================================
set -euo pipefail

# ─── Paramètres personnalisables ───────────────────────────────
DEPLOY_USER="${DEPLOY_USER:-deploy}"     # utilisateur non-root créé pour le déploiement
CREATE_USER="${CREATE_USER:-true}"       # mettre "false" pour ne pas créer d'utilisateur
TIMEZONE="${TIMEZONE:-UTC}"              # ex: Africa/Abidjan, Europe/Paris
SWAP_SIZE="${SWAP_SIZE:-2G}"            # taille du swap (mettre "0" pour désactiver)
SSH_PORT="${SSH_PORT:-22}"

log() { echo -e "\033[1;32m[+]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ce script doit être exécuté en root (sudo bash provision-vps.sh)." >&2
  exit 1
fi

# ─── 1. Mise à jour du système ─────────────────────────────────
log "Mise à jour des paquets système..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw git

# ─── 2. Fuseau horaire ─────────────────────────────────────────
log "Configuration du fuseau horaire : ${TIMEZONE}"
timedatectl set-timezone "${TIMEZONE}" || warn "Impossible de définir le fuseau horaire"

# ─── 3. Swap (utile sur VPS avec peu de RAM) ───────────────────
if [[ "${SWAP_SIZE}" != "0" ]]; then
  if ! swapon --show | grep -q '/swapfile'; then
    log "Création d'un fichier swap de ${SWAP_SIZE}..."
    fallocate -l "${SWAP_SIZE}" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
  else
    log "Swap déjà présent, on ignore."
  fi
fi

# ─── 4. Installation de Docker ─────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  log "Installation de Docker..."
  install -m 0755 -d /etc/apt/keyrings
  # Détecter la distribution (debian ou ubuntu) et son nom de code
  DISTRO_ID="$(. /etc/os-release && echo "${ID}")"
  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"

  # Le dépôt Docker peut ne pas encore publier pour un nom de code très récent
  # (ex. Ubuntu 25.x/26.x). On vérifie sa disponibilité, sinon on retombe sur
  # le dernier LTS connu (noble = 24.04), qui reste compatible.
  if [[ "${DISTRO_ID}" == "ubuntu" ]]; then
    if ! curl -fsSL "https://download.docker.com/linux/ubuntu/dists/${CODENAME}/Release" >/dev/null 2>&1; then
      warn "Dépôt Docker indisponible pour '${CODENAME}', repli sur 'noble' (24.04 LTS)."
      CODENAME="noble"
    fi
  fi

  curl -fsSL "https://download.docker.com/linux/${DISTRO_ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${DISTRO_ID} ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  if apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
    log "Docker installé via le dépôt officiel."
  else
    warn "Échec via le dépôt APT. Repli sur le script officiel get.docker.com."
    rm -f /etc/apt/sources.list.d/docker.list
    curl -fsSL https://get.docker.com | sh
  fi
  systemctl enable --now docker
else
  log "Docker déjà installé : $(docker --version)"
fi

# ─── 5. Pare-feu UFW ───────────────────────────────────────────
log "Configuration du pare-feu UFW..."
ufw allow "${SSH_PORT}"/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

# ─── 6. Utilisateur de déploiement non-root ────────────────────
if [[ "${CREATE_USER}" == "true" ]]; then
  if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
    log "Création de l'utilisateur de déploiement : ${DEPLOY_USER}"
    adduser --disabled-password --gecos "" "${DEPLOY_USER}"
    usermod -aG docker "${DEPLOY_USER}"
    usermod -aG sudo "${DEPLOY_USER}"
    # Recopier les clés SSH de root si présentes
    if [[ -f /root/.ssh/authorized_keys ]]; then
      mkdir -p "/home/${DEPLOY_USER}/.ssh"
      cp /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
      chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
      chmod 700 "/home/${DEPLOY_USER}/.ssh"
      chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
      log "Clés SSH de root copiées vers ${DEPLOY_USER}."
    else
      warn "Aucune clé SSH trouvée dans /root/.ssh/authorized_keys — pensez à en ajouter pour ${DEPLOY_USER}."
    fi
  else
    log "Utilisateur ${DEPLOY_USER} déjà présent."
    usermod -aG docker "${DEPLOY_USER}" || true
  fi
fi

log "Provisioning terminé."
echo
echo "Prochaines étapes :"
echo "  1. Reconnectez-vous en tant que '${DEPLOY_USER}' (ou re-loggez pour appliquer le groupe docker)."
echo "  2. Clonez le dépôt puis suivez VPS_DEPLOYMENT.md."
echo "  3. Vérifiez : docker --version && docker compose version"
