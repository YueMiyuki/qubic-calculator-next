import { NextResponse } from "next/server";

interface DataObject {
  time: number;
  EstimatedIts?: number;
  solutionsPerHour: number;
}

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch("https://qbm.mdesk.tech/api/data", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(body),
  });
  const data: DataObject[] = await response.json();
  const cleanedData = data.map(({ solutionsPerHour, ...rest }) => rest); // eslint-disable-line
  return NextResponse.json(cleanedData);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const response = await fetch("https://qbm.mdesk.tech/api/data", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data: DataObject[] = await response.json();
  const cleanedData = data.map(({ solutionsPerHour, ...rest }) => rest); // eslint-disable-line
  return NextResponse.json(cleanedData);
}

// [{"time":1730225704,"EstimatedIts":7414904},
// {"time":1730217903,"EstimatedIts":0}, ...]
