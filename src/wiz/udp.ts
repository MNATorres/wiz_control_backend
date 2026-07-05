import dgram from "node:dgram";
import os from "node:os";

const WIZ_PORT = 38899;

function subnetBroadcastAddresses(): string[] {
  const addresses: string[] = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      const ip = info.address.split(".").map(Number);
      const mask = info.netmask.split(".").map(Number);
      addresses.push(ip.map((octet, i) => (octet | (~mask[i] & 255))).join("."));
    }
  }
  return addresses;
}

export interface UdpResponse {
  address: string;
  message: unknown;
}

export function sendUnicast(
  ip: string,
  payload: unknown,
  { timeoutMs = 1000, retries = 3 }: { timeoutMs?: number; retries?: number } = {},
): Promise<unknown> {
  const data = Buffer.from(JSON.stringify(payload));

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    let attempt = 0;
    let timer: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timer);
      socket.close();
    };

    const send = () => {
      attempt += 1;
      socket.send(data, WIZ_PORT, ip);
      timer = setTimeout(() => {
        if (attempt < retries) {
          send();
          return;
        }
        cleanup();
        reject(new Error(`No response from ${ip} after ${retries} attempts`));
      }, timeoutMs);
    };

    socket.on("message", (msg) => {
      cleanup();
      try {
        resolve(JSON.parse(msg.toString()));
      } catch (err) {
        reject(err);
      }
    });

    socket.on("error", (err) => {
      cleanup();
      reject(err);
    });

    socket.bind(0, () => send());
  });
}

export function sendBroadcast(payload: unknown, windowMs = 2000): Promise<UdpResponse[]> {
  const data = Buffer.from(JSON.stringify(payload));

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const responses: UdpResponse[] = [];

    socket.on("message", (msg, rinfo) => {
      try {
        responses.push({ address: rinfo.address, message: JSON.parse(msg.toString()) });
      } catch {
        return;
      }
    });

    socket.on("error", (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(0, () => {
      socket.setBroadcast(true);
      for (const address of ["255.255.255.255", ...subnetBroadcastAddresses()]) {
        socket.send(data, WIZ_PORT, address);
      }
      setTimeout(() => {
        socket.close();
        resolve(responses);
      }, windowMs);
    });
  });
}
