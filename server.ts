import { serve } from "bun";
import app from "./index.html";

type TorrentDetail = {
  id: number;
  hash: string;
};

type Magnet = {
  id: number;
  magnet: string;
  name: string;
  ready: true;
};
type MagnetsResponse<T> = {
  magnets: T[];
};

type File = {
  n: string;
  e?: File[];
  l?: string;
};
type MagnetFile = {
  id: string;
  files: File[];
};

type AllDebridResponse<T> = {
  status: "success" | "error";
  data: T;
};

type OrderBy = "uploaded_at" | "seeders" | "downloads";

const sendError = (msg: string, details: any) => {
  return new Response(
    JSON.stringify({
      error: msg,
      details: details,
    }),
    { status: 500 }
  );
};

const searchAndAppend = (links: string[], file: File) => {
  if (file.l) {
    links.push(file.l);
  }

  if (file.e && file.e.length) {
    file.e.forEach((f) => {
      searchAndAppend(links, f);
    });
  }

  return links;
};

const recursiveYggSearch = async (search: string, orderBy: OrderBy, page: number = 1): Promise<string[]> => {
  const res = await fetch(`https://yggapi.eu/torrents?page=${page}&q=${search}&order_by=${orderBy}&per_page=100`);
  const links = await res.json();

  if (links.length > 0) {
    return links.concat(await recursiveYggSearch(search, orderBy, page + 1));
  }

  return links;
};

const server = serve({
  routes: {
    "/": app,
    "/api/search": {
      async POST(req) {
        const { search, orderBy } = await req.json();

        return Response.json(await recursiveYggSearch(search, orderBy));
      },
    },
    "/api/dl": {
      async POST(req) {
        const { torrentId, alldebridApiKey } = await req.json();

        try {
          const res = await fetch(`https://yggapi.eu/torrent/${torrentId}`);
          const torrentDetails: TorrentDetail = await res.json();

          try {
            const response = await fetch(
              `https://api.alldebrid.com/v4/magnet/upload?apikey=${alldebridApiKey}&magnets[]=${torrentDetails.hash}`
            );
            const { data, status }: AllDebridResponse<MagnetsResponse<Magnet>> = await response.json();

            if (status === "error") {
              return sendError("Failed to upload magnet to AllDebrid", data);
            }

            const uploadedMagnet = data.magnets[0];

            if (uploadedMagnet.ready) {
              const form = new FormData();
              form.append("id[]", uploadedMagnet.id.toString());

              const linkResponse = await fetch(`https://api.alldebrid.com/v4/magnet/files?apikey=${alldebridApiKey}`, {
                method: "POST",
                body: form,
              });

              const linkData: AllDebridResponse<MagnetsResponse<MagnetFile>> = await linkResponse.json();

              if (linkData.status === "error") {
                return sendError("Failed to fetch magnet details from AllDebrid", linkData.data);
              }

              const links = linkData.data.magnets[0].files.reduce((acc, file) => {
                return searchAndAppend(acc, file);
              }, [] as string[]);

              const f = new FormData();
              links.forEach((l) => {
                f.append("links[]", l);
              });

              const saveLinksRes = await fetch(
                `https://api.alldebrid.com/v4/user/links/save?apikey=${alldebridApiKey}`,
                {
                  method: "POST",
                  body: f,
                }
              );
              const saveLinksData: AllDebridResponse<{ message: string }> = await saveLinksRes.json();

              if (saveLinksData.status === "error") {
                return sendError("Failed to save links to AllDebrid", saveLinksData.data);
              }
              return Response.json({
                status: "success",
              });
            } else {
              return Response.json({
                status: "pending",
                magnetId: uploadedMagnet.id,
              });
            }
          } catch (error) {
            return sendError("Failed to upload to AllDebrid", error);
          }
        } catch (error) {
          return sendError("Failed to parse yggapi response", error);
        }
      },
    },
  },
  development: !(process.env.NODE_ENV === "production"),
});

console.log(`Server listening on ${server.url}`);
