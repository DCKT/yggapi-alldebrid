import { Button, Card, Spinner, Text } from "@radix-ui/themes";
import { useState, useEffect } from "react";
import { match } from "ts-pattern";
import { AsyncData, Option, Result } from "@swan-io/boxed";
import { Toast } from "radix-ui";

type Torrent = {
  id: number;
  title: string;
  uploaded_at: string;
  size: number;
  downloads: number;
  seeders: number;
};

function formatSize(octets: number): string {
  const mega = octets / (1024 * 1024);
  if (mega >= 1000) {
    const giga = mega / 1024;
    return `${giga.toFixed(2)} GB`;
  }
  return `${mega.toFixed(2)} MB`;
}

type SaveResponse = {
  status: "success" | "pending";
};

enum DisplayType {
  Grid,
  Row,
}
type ToastMessage = {
  status: "success" | "error";
  message: string;
};

export const App = () => {
  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState("seeders");
  const [results, setResults] = useState<AsyncData<Result<Torrent[], any>>>(AsyncData.NotAsked);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [displayType, setDisplayType] = useState(DisplayType.Grid);
  const [toastMessage, setToastMessage] = useState<Option<ToastMessage>>(Option.None());

  const [alldebridApiKey, setAlldebridApiKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAlldebridApiKey(localStorage.getItem("ALLDEBRID_API_KEY") || "");
    }
  }, []);

  const fetchTorrents = async (searchQuery: string, page: number) => {
    setResults(AsyncData.Loading);

    try {
      const response = await fetch(`/api/search`, {
        method: "POST",
        body: JSON.stringify({ search: searchQuery, orderBy, page }),
      });
      const data = await response.json();
      setResults(AsyncData.Done(Result.Ok(data)));
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      setResults(AsyncData.Done(Result.Error(error)));
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
        body: JSON.stringify({ torrentId: torrentId, alldebridApiKey }),
      });
      const data: SaveResponse = await response.json();

      if (data.status === "success") {
        setToastMessage(Option.Some({ status: "success", message: "File saved" }));
      }
      // TODO: handle torrent pending
    } catch (error) {
      setToastMessage(Option.Some({ status: "error", message: "Something went wrong" }));
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4 items-center mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (results.isLoading()) {
              return;
            }
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
          <select
            name="orderBy"
            id="orderBy"
            className="border border-r-0 h-10 border-gray-300"
            onChange={(e) => setOrderBy(e.target.value)}
          >
            <option value="seeders">Seeders</option>
            <option value="downloads">Downloads</option>
            <option value="uploaded_at">Date</option>
          </select>
          <button className="bg-blue-100 h-[41px] p-2 border border-blue-200 rounded-r-lg">🔎</button>
        </form>
        {results.isDone() ? (
          <section className="hidden lg:flex flex-row gap-2">
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
          </section>
        ) : null}
      </div>
      <div
        className={`grid gap-4 ${
          displayType === DisplayType.Grid ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-rows-1"
        }`}
      >
        {results.match({
          NotAsked: () => null,
          Loading: () => <Spinner />,
          Done: (d) => {
            return d.match({
              Error: (error) => (
                <section className="flex flex-col gap-4 text-red-700">
                  <Text>Une erreur est survenue</Text> {error ? <Text>{error}</Text> : null}
                </section>
              ),
              Ok: (d) => {
                return match(d)
                  .with([], () => <Text>No results</Text>)
                  .otherwise(() => {
                    return d.map((torrent) => (
                      <Card key={torrent.id}>
                        <h3 className="text-sm lg:text-lg font-bold break-all">{torrent.title}</h3>
                        <section className="flex flex-row items-center justify-between">
                          <div>
                            <p className="text-xs lg:text-sm text-gray-700">Taille: {formatSize(torrent.size)}</p>
                            <p className="text-sm text-gray-700">Seeders: {torrent.seeders}</p>
                          </div>
                          {alldebridApiKey ? (
                            <Button
                              className="cursor-pointer"
                              onClick={() => {
                                saveTorrent(torrent.id);
                              }}
                            >
                              💾
                            </Button>
                          ) : null}
                        </section>
                      </Card>
                    ));
                  });
              },
            });
          },
        })}
      </div>
      <form>
        <input
          type="text"
          autoFocus
          className="border border-gray-300 rounded p-2 text-lg h-10"
          placeholder="Alldebrid api key"
          value={alldebridApiKey}
          onChange={(e) => {
            setAlldebridApiKey(e.target.value);
            localStorage.setItem("ALLDEBRID_API_KEY", e.target.value);
          }}
        />
      </form>

      {toastMessage.match({
        None: () => null,
        Some: ({ status, message }) => {
          return (
            <Toast.Provider swipeDirection="right">
              <Toast.Root className={`ToastRoot ${status === "success" ? "!bg-green-100" : "!bg-red-100"}`}>
                <Toast.Title className={`ToastTitle ${status === "success" ? "!text-green-700" : "!text-red-700"}`}>
                  {message}
                </Toast.Title>
              </Toast.Root>

              <Toast.Viewport className="ToastViewport" />
            </Toast.Provider>
          );
        },
      })}
    </div>
  );
};
