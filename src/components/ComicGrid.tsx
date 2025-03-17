import Link from "next/link";
import { drive_v3 } from "googleapis";

interface ComicGridProps {
  folders: drive_v3.Schema$File[];
}

export function ComicGrid({ folders }: ComicGridProps) {
  // Function to format the comic title - removes "Invincible - XX - " prefix visually
  const formatComicTitle = (title: string | null | undefined) => {
    if (!title) return "";
    
    // Keep the original title in a data attribute for accessibility
    const match = title.match(/^Invincible - (\d+) - (.+)$/);
    
    if (match) {
      const volumeNumber = match[1];
      const actualTitle = match[2];
      
      return (
        <span className="comic-title" data-full-title={title}>
          <span className="volume-number">{volumeNumber}</span>
          <span className="title-text">{actualTitle}</span>
        </span>
      );
    }
    
    return title;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={`/comics/${folder.id}`}
          className="invincible-card bg-white dark:bg-slate-800 rounded-lg overflow-hidden hover:scale-105 transition-transform"
        >
          <div className="p-4">
            <h3 className="text-lg font-bold truncate">
              {formatComicTitle(folder.name)}
            </h3>
          </div>
        </Link>
      ))}
      {folders.length === 0 && (
        <div className="col-span-full text-center py-10">
          <p className="invincible-title text-xl">AUCUNE BD TROUVÉE</p>
        </div>
      )}
    </div>
  );
} 