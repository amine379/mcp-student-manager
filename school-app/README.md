# Madrasti — مدرستي

Application de suivi pour cours particuliers (1AC / 2AC / 3AC — Maths, Physique-Chimie, SVT).
Bilingue français / arabe, utilisable sur téléphone (installable comme une app).

## Fonctionnalités

| Prof (admin) | Parents / élèves |
|---|---|
| Crée les comptes parents et élèves (un parent peut avoir plusieurs enfants dans des niveaux différents) | Se connectent (le navigateur mémorise le mot de passe) |
| Crée les séances (le niveau se pré-remplit selon l'emploi du temps) et y attache cours / exercices / corrections (PDF ou images) | Consultent les cours de chaque séance |
| Fait l'appel (présent / absent) | Voient les absences de leurs enfants |
| Donne des devoirs, voit qui a rendu, marque « non fait », publie la correction pour tout le groupe | Envoient les photos du devoir |
| Voit les contrôles à venir de tous les élèves | Déclarent les dates de contrôles à l'école + photo de la copie corrigée + note |
| Lit et répond aux messages | Envoient des messages / feedback |

## Architecture

```
téléphone / PC ──► web (nginx :8080) ──► /       → React (fichiers statiques)
                                     └─► /api    → backend FastAPI ──► PostgreSQL
                                     └─► /uploads → photos & PDF (volume Docker)
```

3 conteneurs : `web` (nginx + React), `backend` (FastAPI), `db` (PostgreSQL 16).
Seul `web` est exposé.

## Lancer

```bash
cp .env.example .env      # puis changer les mots de passe
docker compose up -d --build
```

Ouvrir http://localhost:8080 — se connecter avec `ADMIN_USERNAME` / `ADMIN_PASSWORD` du `.env`.

Depuis un téléphone sur le même Wi-Fi : `http://<IP-du-laptop>:8080`
(trouver l'IP avec `ipconfig` → « Adresse IPv4 »). Autoriser le port 8080 dans le pare-feu Windows si besoin.

## Sauvegarde (à faire régulièrement)

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U schoolapp schoolapp > backups/db.sql
docker compose cp backend:/app/uploads ./backups/uploads
```

## Migrer vers un VPS

1. Sur le VPS : installer Docker, copier ce dossier + le `.env`.
2. `docker compose up -d --build`
3. Restaurer la base et les fichiers :
   ```bash
   docker compose exec -T db psql -U schoolapp schoolapp < backups/db.sql
   docker compose cp ./backups/uploads/. backend:/app/uploads
   ```
4. Mettre un nom de domaine + HTTPS (ex. Caddy ou Cloudflare Tunnel devant le port 8080).

## Développement (sans Docker)

```bash
# backend
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
DATABASE_URL=sqlite+aiosqlite:///./dev.db .venv/Scripts/uvicorn app.main:app --reload

# frontend (proxy /api → :8000)
cd frontend && npm install && npm run dev
```

Documentation de l'API : http://localhost:8000/docs
