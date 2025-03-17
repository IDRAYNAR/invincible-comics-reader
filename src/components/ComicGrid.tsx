import Link from "next/link";
import { drive_v3 } from "googleapis";

interface ComicGridProps {
  folders: drive_v3.Schema$File[];
}

export function ComicGrid({ folders }: ComicGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={`/comics/${folder.id}`}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
        >
          <div className="p-4">
            <h3 className="text-lg font-semibold truncate">{folder.name}</h3>
          </div>
        </Link>
      ))}
      {folders.length === 0 && (
        <div className="col-span-full text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No comics found</p>
        </div>
      )}
    </div>
  );
} 