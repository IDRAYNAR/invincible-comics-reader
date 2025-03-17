# Rendre le dépôt public

Ce dépôt a été rendu public pour permettre le déploiement gratuit sur Vercel.

## Sécurité

- Tous les secrets et informations sensibles sont stockés dans le fichier `.env.local` qui est ignoré par Git (via `.gitignore`)
- Seul le fichier d'exemple `.env.local.example` est inclus dans le dépôt, sans aucun secret réel
- Les variables d'environnement seront configurées directement sur Vercel lors du déploiement

Pour déployer sur Vercel, suivez ces étapes :
1. Connectez-vous à [Vercel](https://vercel.com)
2. Importez ce dépôt GitHub
3. Configurez les variables d'environnement dans l'interface Vercel
4. Déployez l'application 