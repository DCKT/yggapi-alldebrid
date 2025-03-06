import type { OrderBy } from "@/app/types";

const recursiveYggSearch = async (search: string, orderBy: OrderBy, page: number = 1): Promise<string[]> => {
  const res = await fetch(`https://yggapi.eu/torrents?page=${page}&q=${search}&order_by=${orderBy}&per_page=100`);
  const links = await res.json();

  if (links.length > 0) {
    return links.concat(await recursiveYggSearch(search, orderBy, page + 1));
  }

  return links;
};

export async function POST(req: Request) {
  const { search, orderBy } = await req.json();
  return Response.json(await recursiveYggSearch(search, orderBy));
}
