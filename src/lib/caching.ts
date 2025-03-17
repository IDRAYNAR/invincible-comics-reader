/**
 * Utilitaires de mise en cache pour optimiser le chargement des images
 * et réduire la charge serveur
 */

import { LRUCache } from 'lru-cache';

// Types pour le gestionnaire de cache
export interface CacheOptions {
  max?: number;
  ttl?: number; // temps de vie en millisecondes
}

// Type de données pouvant être mises en cache
type CacheData = ArrayBuffer | string | Blob | null;

/**
 * Classe de gestion de cache LRU (Least Recently Used)
 * pour stocker des données comme les images
 */
class CacheManager {
  private cache: LRUCache<string, CacheData>;
  
  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache<string, CacheData>({
      max: options.max || 100, // Nombre maximal d'éléments
      ttl: options.ttl || 1000 * 60 * 60 * 24, // 24 heures par défaut
      allowStale: false,
      updateAgeOnGet: true,
    });
  }
  
  /**
   * Récupère une valeur du cache
   */
  get(key: string): CacheData {
    return this.cache.get(key) || null;
  }
  
  /**
   * Met une valeur dans le cache
   */
  set(key: string, value: CacheData, options?: { ttl?: number }): void {
    this.cache.set(key, value, options);
  }
  
  /**
   * Vérifie si une clé existe dans le cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Supprime une valeur du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Récupère toutes les clés du cache
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
  
  /**
   * Récupère la taille actuelle du cache
   */
  get size(): number {
    return this.cache.size;
  }
}

// Exporter une instance unique du gestionnaire de cache pour les images
export const imageCache = new CacheManager({
  max: 200, // Stocker jusqu'à 200 images
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 jours
});

// Fonction utilitaire pour générer des clés de cache cohérentes
export const generateCacheKey = (id: string, format: string = 'default'): string => {
  return `image-${id}-${format}`;
};

// Fonction utilitaire pour mettre en cache et récupérer les résultats d'une fonction async
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Vérifier si la valeur est en cache
  const cachedValue = imageCache.get(key);
  if (cachedValue) {
    return cachedValue as T;
  }
  
  // Sinon, exécuter la fonction de récupération
  const result = await fetchFn();
  
  // Mettre en cache le résultat
  imageCache.set(key, result as unknown as CacheData, { ttl });
  
  return result;
} 