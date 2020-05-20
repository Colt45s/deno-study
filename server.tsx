import {
  Application,
  Router,
  send,
} from "https://deno.land/x/oak@v4.0.0/mod.ts";
import {
  WebSocket,
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std@0.51.0/ws/mod.ts";
import { v4 } from "https://deno.land/std@0.51.0/uuid/mod.ts";
import { Chat } from "./components/Chat.jsx";
import React from "react";
import ReactDomServer from "react-dom/server";

const users = new Map<string, WebSocket>();

function broadcast(message: string, senderId?: string) {
  console.log(message);
  if (!message) return;
  for (const sock of users.values()) {
    sock.send(senderId ? `[${senderId}]: ${message}` : message);
  }
}

const router = new Router();
router
  .get("/", (ctx) => {
    const body = ReactDomServer.renderToString(<Chat />);

    ctx.response.body = `
    <!DOCTYPE html>
    <html>
      <head>
      </head>
      <body>
        <div id="root">${body}</div>
        <script type="module" src="./bundle.js"></script>
      </body>
    </html>
    `;
  })
  .get("/ws", async (ctx) => {
    const { serverRequest: req } = ctx.request;
    const { conn, r: bufReader, w: bufWriter, headers } = req;

    try {
      const sock = await acceptWebSocket(
        { conn, bufWriter, bufReader, headers },
      );

      const userId = v4.generate();
      users.set(userId, sock);

      broadcast(`> User with the id ${userId} is connected`);

      try {
        for await (const ev of sock) {
          if (typeof ev === "string") {
            // text message
            console.log("ws:Text", ev);
            broadcast(ev, userId);
          } else if (ev instanceof Uint8Array) {
            // binary message
            console.log("ws:Binary", ev);
          } else if (isWebSocketPingEvent(ev)) {
            const [, body] = ev;
            // ping
            console.log("ws:Ping", body);
          } else if (isWebSocketCloseEvent(ev)) {
            // close
            const { code, reason } = ev;
            console.log("ws:Close", code, reason);
          }
        }
      } catch (err) {
        console.error(`failed to receive frame: ${err}`);
        if (!sock.isClosed) {
          await sock.close(1000).catch(console.error);
        }
      }
    } catch (err) {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    }
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (context) => {
  await send(context, context.request.url.pathname, {
    root: `${Deno.cwd()}/static`,
  });
});

app.addEventListener("error", (e) => {
  console.log(e.error);
});

await app.listen({ port: 3000 });
