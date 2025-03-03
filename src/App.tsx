import { Button, Card, Text } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { match } from "ts-pattern";
import { Option } from "@swan-io/boxed";

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

enum DisplayType {
  Grid,
  Row,
}

export const App = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option<Torrent[]>>(Option.None());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [displayType, setDisplayType] = useState(DisplayType.Grid);

  const fetchTorrents = async (searchQuery: string, page: number) => {
    try {
      const response = await fetch(`/api/search`, {
        method: "POST",
        body: JSON.stringify({ search: searchQuery, page: page }),
      });
      const data = await response.json();
      setResults(Option.Some(data));
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
      <div className="flex space-x-2 items-center mb-4">
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
        {results.isSome() ? (
          <>
            <Button
              disabled={displayType === DisplayType.Grid}
              onClick={(_) => {
                setDisplayType((_) => DisplayType.Grid);
              }}
            >
              grille
            </Button>
            <Button
              disabled={displayType === DisplayType.Row}
              onClick={(_) => {
                setDisplayType((_) => DisplayType.Row);
              }}
            >
              colonne
            </Button>
          </>
        ) : null}
      </div>
      <div
        className={`grid gap-4 ${displayType === DisplayType.Grid ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-rows-1"}`}
      >
        {results.match({
          None: () => null,
          Some: (d) => {
            return match(d)
              .with([], () => <Text>No results</Text>)
              .otherwise(() => {
                return d.map((torrent) => (
                  <Card key={torrent.id}>
                    <h3 className="text-lg font-bold break-all">
                      {torrent.title}
                    </h3>
                    <section className="flex flex-row items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Taille: {octetToMega(torrent.size).toFixed(2)} Mb
                        </p>
                        <p className="text-sm text-gray-700">
                          Seeders: {torrent.seeders}
                        </p>
                      </div>
                      <Button
                        className="cursor-pointer"
                        onClick={(_) => {
                          saveTorrent(torrent.id);
                        }}
                      >
                        💾
                      </Button>
                    </section>
                  </Card>
                ));
              });
          },
        })}
      </div>
    </div>
  );
};
