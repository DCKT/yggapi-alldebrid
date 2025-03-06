/* eslint-disable @typescript-eslint/no-explicit-any */
import { TorrentDetail, AllDebridResponse, MagnetsResponse, MagnetFile, Magnet, File } from "@/app/types";

const ALLDEBRID_API_KEY = process.env.ALLDEBRID_API_KEY;

if (!ALLDEBRID_API_KEY) {
  throw new Error("ALLDEBRID_API_KEY env is missing");
}

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

export async function POST(req: Request) {
  const { torrentId } = await req.json();

  try {
    const res = await fetch(`https://yggapi.eu/torrent/${torrentId}`);
    const torrentDetails: TorrentDetail = await res.json();

    try {
      const response = await fetch(
        `https://api.alldebrid.com/v4/magnet/upload?apikey=${ALLDEBRID_API_KEY}&magnets[]=${torrentDetails.hash}`
      );
      const { data, status }: AllDebridResponse<MagnetsResponse<Magnet>> = await response.json();

      if (status === "error") {
        return sendError("Failed to upload magnet to AllDebrid", data);
      }

      const uploadedMagnet = data.magnets[0];

      if (uploadedMagnet.ready) {
        const form = new FormData();
        form.append("id[]", uploadedMagnet.id.toString());

        const linkResponse = await fetch(`https://api.alldebrid.com/v4/magnet/files?apikey=${ALLDEBRID_API_KEY}`, {
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

        const saveLinksRes = await fetch(`https://api.alldebrid.com/v4/user/links/save?apikey=${ALLDEBRID_API_KEY}`, {
          method: "POST",
          body: f,
        });
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
}
