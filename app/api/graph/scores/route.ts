import { NextResponse } from "next/server";

interface DataObject {
  time: number;
  TotalCurrent: number;
  totalScores: number;
}

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch("https://qbm.mdesk.tech/api/scores", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(body),
  });
  const data: DataObject[] = await response.json();
  return NextResponse.json(data);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const response = await fetch("https://qbm.mdesk.tech/api/scores", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data: DataObject[] = await response.json();
  return NextResponse.json(data);
}

// [{"time":1730227503,"TotalCurrent":155.42455621301775,"totalScores":105067},
// {"time":1730223903,"TotalCurrent":155.07988165680473,"totalScores":104834}, ...]
