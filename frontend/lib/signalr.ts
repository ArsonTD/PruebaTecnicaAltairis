"use client";

import * as signalR from "@microsoft/signalr";
import { getApiUrl } from "./api";

let connection: signalR.HubConnection | null = null;

export async function getHub(token: string | null): Promise<signalR.HubConnection> {
  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    return connection;
  }
  if (connection) {
    try { await connection.stop(); } catch { /* ignore */ }
    connection = null;
  }

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${getApiUrl()}/hubs/availability`, {
      accessTokenFactory: () => token ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  await connection.start();
  return connection;
}

export async function stopHub() {
  if (connection) {
    try { await connection.stop(); } catch { /* ignore */ }
    connection = null;
  }
}
