import dgram from "node:dgram";

const WIZ_PORT = 38899;

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
      socket.send(data, WIZ_PORT, "255.255.255.255");
      setTimeout(() => {
        socket.close();
        resolve(responses);
      }, windowMs);
    });
  });
}
