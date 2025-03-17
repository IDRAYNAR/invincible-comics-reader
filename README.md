# Invincible Comics Reader

Une application Next.js pour lire des comics stockés sur Google Drive.

## Fonctionnalités

- Authentification avec Google OAuth
- Accès aux fichiers Google Drive
- Lecteur de comics intégré
- Interface responsive

## Configuration locale

1. Clonez le dépôt
   ```bash
   git clone https://github.com/votre-username/invincible-comics-reader.git
   cd invincible-comics-reader
   ```

2. Installez les dépendances
   ```bash
   npm install
   ```

3. Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :
   ```
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

4. Lancez le serveur de développement
   ```bash
   npm run dev
   ```

## Déploiement sur Vercel

### Méthode 1 : Déploiement automatique depuis GitHub

1. Poussez votre code sur GitHub
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. Connectez-vous à [Vercel](https://vercel.com)
3. Cliquez sur "New Project"
4. Importez votre dépôt GitHub
5. Configurez les variables d'environnement dans l'interface Vercel :
   - `NEXTAUTH_URL` : URL de votre application déployée (ex: https://votre-app.vercel.app)
   - `NEXTAUTH_SECRET` : Une chaîne aléatoire pour sécuriser les sessions
   - `GOOGLE_CLIENT_ID` : Votre ID client Google OAuth
   - `GOOGLE_CLIENT_SECRET` : Votre secret client Google OAuth
6. Cliquez sur "Deploy"

### Méthode 2 : Déploiement avec Vercel CLI

1. Installez Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. Connectez-vous à Vercel
   ```bash
   vercel login
   ```

3. Déployez l'application
   ```bash
   vercel
   ```

4. Pour déployer en production
   ```bash
   vercel --prod
   ```

## Sécurité

- Les variables d'environnement sensibles sont stockées dans `.env.local` qui est ignoré par Git
- L'authentification est gérée par NextAuth.js
- Les tokens d'accès sont stockés de manière sécurisée dans les sessions JWT

## Licence

MIT
