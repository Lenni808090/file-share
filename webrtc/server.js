import express from "express";
import { WebSocketServer } from "ws"
import { createServer } from "http";
import { json } from "stream/consumers";
import { type } from "os";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;
const rooms = new Map()

wss.on("connection", (ws) => {
    console.log("new conn");

    ws.on("close", () => {
        console.log("conn closed");

        for (const [roomId, clients] of rooms) {
            if (clients.has(ws)) {
                clients.delete(ws);
                if (clients.size === 0) {
                    rooms.delete(roomId);
                    console.log("room " + roomId + " closed");
                }
            }
        }

    })

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());

            console.log("received:", msg);

            if (msg.type === "join") {
                const roomId = msg.roomId;

                if (rooms.has(roomId)) {

                    const map = rooms.get(roomId)

                    if (map.size < 2) {
                        map.set(ws, "receiver");
                        if (map.size === 2) {
                            //keys of the map ergo ws
                            for (const client of map.keys) {
                                if (client !== ws) {
                                    client.send(JSON.stringify({
                                        type: "peer-joined",
                                        message: "the receiver joined bussi",
                                        roomId
                                    }));
                                }
                            }
                        }
                        console.log("client joined room " + roomId);
                        ws.send(JSON.stringify({
                            type: "success",
                            message: "successfully joined room",
                            roomId
                        }))
                    } else {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "already 2 people in server",
                            roomId
                        }));

                        ws.close(1008, "Room is full");
                        return;
                    }
                } else {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "no such room available",
                        roomId
                    }));
                    ws.close(1008, "no such room");
                    return;
                }
            } else if (msg.type === "create-room") {
                const roomId = msg.roomId;
                rooms.set(roomId, new Map());
                const map = rooms.get(roomId)
                map.set(ws, "sender");
                ws.send(JSON.stringify({
                    type: "room-created",
                    roomId,
                    yourRole: "sender"
                }))
            }
        } catch (error) {
            console.error(error.message);
        }
    })
})

server.listen(PORT, () => {
    console.log("server running on " + PORT);
})