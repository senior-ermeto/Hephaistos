# 🔥 HÉPHAÏSTOS — Système de Suivi Machine & Atelier
**Senior Aerospace Ermeto** — *Application Web (React + FastAPI + PostgreSQL + Docker Debian) & Application Android (Kotlin Jetpack Compose)*

---

## 🏛️ Pourquoi le nom « HÉPHAÏSTOS » ?
Dans la mythologie grecque, **Héphaïstos** est le dieu du feu, des forges, de la métallurgie, des artisans et des machines. Seul dieu travailleur de l'Olympe et créateur des premiers automates, il incarne la précision industrielle et l'excellence mécanique de **Senior Aerospace Ermeto**.

---

## ✨ Fonctionnalités Principales

### 📱 Application Android (`mobile-android/` & Terminal Web)
- **Identification Opérateur** : L'utilisateur précise qui il est au lancement.
- **Bouton « Changement d'opérateur »** : Accessible en permanence en haut de l'écran et **journalisé côté serveur** (date, heure, opérateur sortant, opérateur entrant, machine).
- **Liste des Machines Dynamique** : Récupère en temps réel les machines créées depuis l'interface Web.
- **Déclarations en 1 clic sur une Machine** :
  - 🟢 **Production**
  - 🟡 **Pause**
  - 🔴 **Arrêt** :
    - 🟣 **Changement d'outil**
    - 🟠 **Attentes**
    - 🔴 **Panne**
    - ⚪ **Autres arrêts (précisé en texte obligatoire)**

### 💻 Application Web & Serveur (`frontend/` + `backend/`)
- **Authentification Sécurisée (Login / Mot de passe)** avec gestion des rôles (`ADMIN`, `MANAGER`, `OPERATOR`).
- **Tableau par Semaine avec Antériorité** :
  - Navigation fluide entre la semaine actuelle et les semaines passées ($S-1, S-2, \dots$).
  - Matrice visuelle **Machine × Jours de la semaine (Lundi → Dimanche)** avec barres de répartition colorées, calcul automatique du **TRS / Disponibilité**, temps de production et temps d'arrêts.
  - Clic sur une journée machine pour inspecter la chronologie exacte minute par minute.
- **Journal Détaillé & Filtres Avancés** :
  - Affichage des **Nom / Prénom**, **Heure exacte**, **Durée**, **Machine**, **Statut** et **Motif texte**.
  - **Filtre par Utilisateur / Opérateur** permettant de visualiser instantanément toutes les déclarations et le bilan hebdomadaire d'un opérateur précis.
  - Export **CSV / Excel** en 1 clic.
- **Administration Complète** :
  - **Création de nouvelles machines** via la page Web.
  - **Gestion des comptes utilisateurs** par l'Admin (création des opérateurs de l'application Android avec code PIN et Badge NFC/QR + comptes Web).
- **Écran Géant Atelier (Mode Andon TV)** :
  - Vue temps réel via **WebSockets** pour affichage sur téléviseur d'îlot.

---

## 🎨 Identité Visuelle & Logos
- **Couleur Principale** : `#00305B` (Bleu Marine Senior Aerospace Ermeto).
- **Dossier `/logo` à la racine** :
  - `logo/logo_application_senior_aerospace_ermeto_ico.ico`
  - `logo/logo_application_senior_aerospace_ermeto_vector.svg`
  - `logo/logo_ermeto_classic_grand_vector.svg`

---

## 🚀 Déploiement sur Debian (Docker & `./install.sh`)

Sur votre serveur **Debian**, clonez le dépôt puis utilisez le script `./install.sh` :

```bash
chmod +x install.sh

# 1. Installer Docker (si absent), configurer PostgreSQL et lancer l'application :
./install.sh install

# 2. Mettre à jour l'application (sauvegarde BDD auto + git pull + rebuild sans perte) :
./install.sh update

# 3. Vérifier l'état des conteneurs :
./install.sh status

# 4. Sauvegarder la base de données PostgreSQL :
./install.sh backup

# 5. Désinstaller proprement :
./install.sh uninstall
```

### Compte Administrateur par défaut au premier démarrage :
| Rôle | Identifiant | Mot de passe | Code PIN Android |
| :--- | :--- | :--- | :--- |
| **Administrateur** | `admin` | `admin123` | `0000` |

---

## 📱 Compilation de l'Application Android
1. Ouvrez le dossier [`mobile-android/`](./mobile-android) dans **Android Studio**.
2. Lancez l'application sur une tablette ou un terminal Android (ou générez l'APK via `Build > Build Bundle(s) / APK(s) > Build APK(s)`).
3. Cliquez sur l'icône ⚙️ en haut à droite de l'application Android pour renseigner l'adresse IP de votre serveur Debian (ex: `http://192.168.1.50`).
