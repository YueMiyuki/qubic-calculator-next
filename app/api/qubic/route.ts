import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch("https://api.qubic.li/Auth/Login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const response = await fetch("https://api.qubic.li/Score/Get", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  // console.log(data)
  return NextResponse.json(data);
}
