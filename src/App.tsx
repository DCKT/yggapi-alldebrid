import { useState, useEffect } from "react";

type Torrent = {
  id: number;
  title: string;
  uploaded_at: string;
  size: number;
  downloads: number;
  seeders: number;
};

function octetToMega(octets: number): number {
  return octets / (1024 * 1024);
}

type SaveResponse = {
  status: "success" | "pending";
};

export const App = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Torrent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTorrents = async (searchQuery: string, page: number) => {
    try {
      const response = await fetch(`/api/search`, {
        method: "POST",
        body: JSON.stringify({ search: searchQuery, page: page }),
      });
      const data = await response.json();
      setResults(data);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      // TODO: handle error
    }
  };

  const onSubmit = () => {
    setPage(1);
    fetchTorrents(query, 1);
  };

  useEffect(() => {
    if (query) fetchTorrents(query, page);
  }, [page]);

  const saveTorrent = async (torrentId: number) => {
    try {
      const response = await fetch(`/api/dl`, {
        method: "POST",
        body: JSON.stringify({ torrentId: torrentId }),
      });
      const data: SaveResponse = await response.json();
      // TODO: handle success message
      // TODO: handle torrent pending
    } catch (error) {
      // TODO: handle error
    }
  };

  return (
    <div className="p-4">
      <div className="flex space-x-2 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            type="text"
            autoFocus
            className="border border-r-0 border-gray-300 rounded-l-lg p-2 text-lg h-10"
            placeholder="Rechercher un torrent..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="bg-blue-100 h-[41px] p-2 border border-blue-200 rounded-r-lg">
            🔎
          </button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((torrent) => (
          <div key={torrent.id}>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-bold break-all">{torrent.title}</h3>
              <section className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Taille: {octetToMega(torrent.size).toFixed(2)} Mb
                  </p>
                  <p className="text-sm text-gray-700">
                    Seeders: {torrent.seeders}
                  </p>
                </div>
                <button
                  className="bg-blue-100 p-2 rounded cursor-pointer hover:bg-blue-200"
                  onClick={(_) => {
                    saveTorrent(torrent.id);
                  }}
                >
                  💾
                </button>
              </section>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
