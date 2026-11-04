# Madrasti — Comprendre ton déploiement

Ce fichier explique **comment ton application fonctionne**, brique par brique, et **toutes les commandes** utiles. Écrit pour toi (dev Java/Spring), avec des comparaisons vers ce que tu connais déjà.

---

## 1. Le schéma d'ensemble

Voici le trajet complet, depuis le téléphone d'un parent jusqu'à ta base de données :

```
                        INTERNET
                           │
        https://madrasti.nejmora.com   ← l'adresse que tu partages
                           │
                           ▼
                    ┌──────────────┐
                    │  CLOUDFLARE  │  certificat HTTPS, cache, protection
                    └──────┬───────┘
                           │  tunnel sortant chiffré (pas de port ouvert sur ta box)
                           ▼
 ═════════════ LAPTOP SERVEUR (DESKTOP-5V28ULN, Windows 10) ═════════════
                           │
                    ┌──────────────┐
                    │  cloudflared │  connecteur du tunnel (service systemd, dans WSL)
                    └──────┬───────┘
                           │  http://localhost:8080
                           ▼
 ┌──────────────── WSL2 (Ubuntu Linux) — moteur Docker ──────────────────┐
 │                                                                        │
 │   ┌──────────────┐    requêtes /api/*   ┌──────────────┐              │
 │   │  web (nginx) │ ───────────────────► │   backend    │              │
 │   │  port 8080→80│                      │  (FastAPI)   │              │
 │   │  + site React│ ◄─── sert le site    │  port 8000   │              │
 │   └──────────────┘                      └──────┬───────┘              │
 │                                                │ requêtes SQL         │
 │                                                ▼                      │
 │                                         ┌──────────────┐              │
 │                                         │ db (Postgres)│              │
 │                                         │  port 5432   │              │
 │                                         └──────┬───────┘              │
 │                                                │                      │
 │   Volumes (les données qui SURVIVENT) :        │                      │
 │     • postgres_data  ◄─────────────────────────┘                      │
 │     • uploads        ◄──── photos des devoirs & PDF                   │
 └────────────────────────────────────────────────────────────────────────┘
```

**L'idée clé :** chaque couche a un seul rôle, et les données importantes vivent dans des **volumes** séparés du code (donc elles ne se perdent pas quand on met à jour l'app).

---

## 2. Les briques, une par une

### Docker — « emballer l'app avec tout ce qu'il lui faut »
Un logiciel a besoin d'un environnement précis (une version de Python, des librairies, etc.). Docker **emballe l'app + son environnement** dans une **image**, qui tourne ensuite dans un **conteneur**.

| Terme Docker | C'est quoi | Comparaison Java |
|---|---|---|
| **Image** | le modèle figé (app + système + dépendances) | un `.jar` + son JRE packagés ensemble |
| **Conteneur** | une image en train de tourner | ton app lancée (`java -jar`) |
| **Volume** | un disque qui survit au conteneur | un dossier de données persistant / une vraie base |
| **Docker Compose** | lance plusieurs conteneurs ensemble d'un fichier | un `docker-compose.yml` = ton orchestration |

**Pourquoi c'est pratique :** le conteneur est **jetable**. Tu le supprimes, tu le recrées, c'est identique partout (ton laptop perso, le serveur, un futur VPS). D'où « portable ».

### Docker Compose — le chef d'orchestre
Le fichier `docker-compose.yml` décrit tes **3 services** (`web`, `backend`, `db`), comment ils se parlent, et quels volumes utiliser. Une seule commande (`docker compose up`) démarre tout.

### Les 3 conteneurs de Madrasti

| Service | Rôle | Techno | Comparaison |
|---|---|---|---|
| **web** | sert le site + redirige `/api` vers le backend | nginx + fichiers React | un reverse proxy + les fichiers statiques |
| **backend** | la logique métier, l'API (login, devoirs, absences…) | FastAPI (Python) | ton Spring Boot (controllers + services) |
| **db** | stocke tout (comptes, notes, absences…) | PostgreSQL | ta base de données |

### WSL — « un vrai Linux dans Windows »
**WSL2** (Windows Subsystem for Linux) fait tourner un **vrai noyau Linux à l'intérieur de Windows**, dans une machine virtuelle légère. On y a installé **Ubuntu**, et c'est **dedans** que Docker tourne.

> Pourquoi dedans et pas directement sur Windows ? Parce que Docker Desktop (la version Windows) **ne marche pas en SSH** (problème d'identifiants). Docker **natif dans Linux (WSL)** n'a pas ce souci — c'est son environnement naturel. C'est la galère qu'on a résolue.

### Les variables d'environnement — le fichier `.env`
Le `.env` contient les **réglages secrets** que l'app lit au démarrage (mots de passe, clés). On les met là, **pas dans le code**, pour deux raisons : le code peut aller sur GitHub sans fuiter les secrets, et on change les réglages sans retoucher le code.

> Comparaison Spring : c'est ton `application.properties` / variables d'environnement.

Ton `.env` :

| Variable | Rôle |
|---|---|
| `DB_PASSWORD` | mot de passe de la base PostgreSQL |
| `SECRET_KEY` | clé qui signe les jetons de connexion (JWT) — **à garder secrète** |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | ton compte prof créé au premier démarrage |
| `APP_PORT` | le port exposé (8080) |

### nginx — le portier
nginx reçoit **toutes** les requêtes sur le port 8080 et décide :
- `/api/...` → il transmet au **backend** (FastAPI)
- tout le reste → il sert les **fichiers du site** (React)

Comme le site et l'API sont sur **le même domaine**, pas de problème de CORS, et une seule adresse à exposer.

### PostgreSQL — la mémoire
La base de données. Tout ce qui doit être retenu (comptes, séances, devoirs, absences, contrôles, messages) y est stocké. Elle vit dans le volume `postgres_data`.

### Les volumes — les données qui survivent
Un conteneur est jetable, mais les données non. Les **volumes** sont des disques gérés par Docker, **séparés** des conteneurs :
- `postgres_data` → la base de données
- `uploads` → les photos des devoirs et les PDF

Quand tu mets à jour le code, les conteneurs sont recréés **mais les volumes restent** → **aucune donnée perdue**.

---

## 3. Comment l'app est publiée sur internet

### Le problème
Ton serveur est chez toi, derrière la box. Il **n'a pas d'adresse publique fixe** : l'IP de la box change, et aucun port n'est ouvert vers l'extérieur (tant mieux, c'est plus sûr).

### La solution : un TUNNEL
Au lieu d'ouvrir un port (dangereux + IP qui change), **ton serveur se connecte vers l'extérieur** et garde ce « tunnel » ouvert. Les visiteurs passent par ce tunnel :

```
parent → Cloudflare → (tunnel déjà ouvert) → ton serveur
```

Ton IP maison n'est **jamais** l'adresse publique. Donc :
- la box change d'IP → **le lien marche toujours**
- tu changes de Wi-Fi / passes en 4G → **le lien marche toujours**

C'est **l'inverse** de l'ancienne méthode (« port forwarding ») où l'adresse = l'IP de la box, qui change.

### Les deux tunnels qu'on a utilisés

| Outil | À quoi il sert chez toi | Adresse |
|---|---|---|
| **Tailscale** | ton réseau privé pour **administrer** le serveur (SSH de partout) | `...ts.net` |
| **Cloudflare Tunnel** | l'accès **public** des parents, avec ton domaine | `madrasti.nejmora.com` |

**Cloudflare Tunnel** en détail : le petit programme `cloudflared` (installé dans WSL en service) ouvre le tunnel vers Cloudflare. Dans le dashboard, tu as dit : « `madrasti.nejmora.com` → `http://localhost:8080` ». Cloudflare fournit le **certificat HTTPS** (le cadenas) et envoie le trafic dans le tunnel jusqu'à nginx.

---

## 4. Le trajet d'une requête (exemple concret)

Un parent ouvre `https://madrasti.nejmora.com` et se connecte :

1. Le navigateur résout `madrasti.nejmora.com` → pointe vers **Cloudflare**.
2. Cloudflare reçoit la requête (HTTPS), l'envoie dans le **tunnel**.
3. `cloudflared` (dans ton WSL) la reçoit et la passe à `http://localhost:8080`.
4. **nginx** reçoit la requête :
   - c'est `/` → il renvoie le **site React** (la page de connexion).
5. Le parent tape son mot de passe → le navigateur appelle `/api/auth/login`.
6. nginx voit `/api/...` → il transmet au **backend FastAPI**.
7. Le backend vérifie le mot de passe dans **PostgreSQL**, renvoie un **jeton** (signé avec `SECRET_KEY`).
8. Les requêtes suivantes portent ce jeton → le backend sait qui c'est, renvoie les devoirs/absences de ses enfants.
9. Une photo de devoir envoyée → stockée dans le volume **uploads**.

---

## 5. Les commandes essentielles (antisèche)

> Toutes à lancer **dans WSL Ubuntu** (`wsl -d Ubuntu`), dans le dossier du projet :
> `cd /mnt/c/Users/inco/madrasti`

### Voir l'état
```bash
sudo docker compose ps
```

### Voir les logs (utile si un souci)
```bash
sudo docker compose logs backend --tail 50      # le backend
sudo docker compose logs -f backend             # en direct (Ctrl+C pour sortir)
```

### Démarrer / arrêter / redémarrer
```bash
sudo docker compose up -d          # démarrer (en arrière-plan)
sudo docker compose down           # arrêter (les données restent)
sudo docker compose restart        # redémarrer
```

### Mettre à jour le code
```bash
# 1) récupérer la nouvelle version (côté Windows PowerShell, où git est connecté) :
#    cd C:\Users\inco\madrasti ; git pull
# 2) reconstruire et relancer (dans WSL) :
sudo docker compose up -d --build
```
Les données sont conservées. Docker reconstruit seulement ce qui a changé.

### Sauvegarder (à faire régulièrement !)
```bash
mkdir -p backups
sudo docker compose exec -T db pg_dump -U schoolapp schoolapp > backups/db-$(date +%F).sql
sudo docker compose cp backend:/app/uploads ./backups/uploads
```
Ça crée une copie de la base + des photos dans `backups/` (visible aussi depuis Windows).

### Le tunnel Cloudflare
```bash
sudo systemctl status cloudflared     # voir s'il tourne
sudo systemctl restart cloudflared    # le redémarrer si besoin
```

---

## 6. Pourquoi on a galéré (et les leçons)

| Problème rencontré | Cause | Solution retenue |
|---|---|---|
| Docker refusait de tourner en SSH (« logon session does not exist ») | Docker **Desktop** a besoin d'une session de bureau, pas dispo en SSH | Docker **natif dans WSL/Ubuntu** |
| Le lien renvoyait 502 | Docker Desktop occupait le port 8080, puis le réseau WSL↔Windows | On a tout mis dans WSL + Cloudflare pointe sur `localhost` dans WSL |
| Le backend redémarrait en boucle | Docker lancé « à la main » sans gestionnaire → WSL coupait | **systemd activé** dans WSL → Docker en service stable |
| L'app ne survivait pas au reboot | pareil | systemd + `restart: unless-stopped` + tunnel en service |

**La grande leçon :** sur un serveur Windows piloté en SSH, fais tourner Docker **dans WSL (Linux)**, avec **systemd** activé. Tout devient stable et automatique.

---

## 7. Tes accès et infos clés

| Quoi | Valeur |
|---|---|
| **Adresse publique (parents)** | https://madrasti.nejmora.com |
| **Admin de l'app** | identifiant `prof` + ton mot de passe (à renforcer !) |
| **Serveur** | laptop `DESKTOP-5V28ULN`, Windows 10 |
| **Code sur le serveur** | `C:\Users\inco\madrasti` (vu depuis WSL : `/mnt/c/Users/inco/madrasti`) |
| **Dépôt GitHub** | `amine379/madrasti` (privé) |
| **Secrets** | dans le fichier `.env` (jamais sur GitHub) |

### À ne pas oublier
- [ ] **Renforcer le mot de passe prof** (dans l'app → Compte) avant de donner le lien aux parents.
- [ ] **Supprimer les tokens GitHub** collés pendant l'installation (github.com/settings/tokens).
- [ ] **Faire une sauvegarde** régulièrement (commande section 5).
- [ ] Le jour du **VPS** : `git clone` + copier le `.env` + restaurer la sauvegarde + `docker compose up`.
```

---

*Généré pour t'aider à comprendre ton déploiement Madrasti. Garde ce fichier à jour si l'architecture évolue.*
