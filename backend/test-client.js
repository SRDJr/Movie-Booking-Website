// test-client.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
const SHOW_ID = "693b39c81ec053746cb09557"; // Copy from MongoDB Compass
const USER_ID = "693b1c4cecd79cc524098971"; // Copy from MongoDB Compass

socket.on("connect", () => {
  console.log("Connected to server");

  // 1. Join Room
  socket.emit("join_show", SHOW_ID);

  // 2. Request Lock (Row 0, Col 0)
  setTimeout(() => {
    console.log("Requesting Lock...");
    socket.emit("request_seat_lock", {
      showId: SHOW_ID,
      row: 0,
      col: 0,
      userId: USER_ID
    });
  }, 1000);
});

// Listen for updates
socket.on("seat_updated", (data) => {
  console.log(">> BROADCAST RECEIVED:", data);
});

socket.on("lock_failed", (data) => {
  console.log(">> LOCK FAILED:", data);
});