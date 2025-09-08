import React, { useEffect, useRef, useState } from "react";
import { RealtimeChannel, Session, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { updateRoomDrawing } from "@/app/services/drawing-room.service";
import { supabase } from "@/app/lib/initSupabase";
import { fetchUserById, getUserSession } from "@/app/services/user.service";
import { DrawingPen } from "./BoardContainer";

interface DrawingRoom {
  id: string;
  drawing: string | null;
}

interface BoardProps {
  room: DrawingRoom;
  drawingPen: DrawingPen;
}

interface CursorPayload {
  type: "broadcast";
  event: string;
  payload: {
    userId: string;
    x: number;
    y: number;
  };
}

function WhiteBoard({ room, drawingPen }: BoardProps) {
  const MOUSE_EVENT = "cursor";

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [drawingData, setDrawingData] = useState<string | null>(null);

  const boardAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const createdCursorsRef = useRef<string[]>([]);

  const createUserMouseCursor = async (_userId: string) => {
    if (typeof document === "undefined") return;
    if (createdCursorsRef.current.includes(_userId)) return;

    const existingCursorDiv = document.getElementById(_userId + "-cursor");
    if (existingCursorDiv) return;

    const cursorDiv = document.createElement("div");
    const svgElem = document.createElement("svg");
    svgElem.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" 
  class="bi bi-cursor-fill" viewBox="0 0 16 16">  
  <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 
  10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 
  .556.103z"/>
</svg>
`;

    cursorDiv.id = _userId + "-cursor";
    cursorDiv.classList.add("h-4", "w-4", "absolute", "z-50", "-scale-x-100");

    const { user } = await fetchUserById(_userId);
    cursorDiv.style.color = user?.user_metadata?.userColor;

    cursorDiv.appendChild(svgElem);
    boardAreaRef.current?.appendChild(cursorDiv);

    createdCursorsRef.current.push(_userId);
  };

  const receivedCursorPosition = ({ payload }: CursorPayload) => {
    if (typeof document === "undefined") return;

    const { userId: _userId, x, y } = payload;
    const cursorDiv = document.getElementById(_userId + "-cursor");

    if (cursorDiv) {
      cursorDiv.style.left = x + "px";
      cursorDiv.style.top = y + "px";
    } else {
      createUserMouseCursor(_userId);
    }
  };

  const sendMousePosition = (channel: RealtimeChannel, userId: string, x: number, y: number) => {
    return channel.send({
      type: "broadcast",
      event: MOUSE_EVENT,
      payload: { userId, x, y },
    });
  };

  // Track mouse movements
  useEffect(() => {
    const boardArea = boardAreaRef.current;
    if (!boardArea) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isAuthenticated || !channel || !session?.user?.id) return;

      const container = document.querySelector("#container");
      if (!container) return;

      const containerOffset = container.getBoundingClientRect();
      const relativeX = e.clientX - containerOffset.left;
      const relativeY = e.clientY - containerOffset.top;

      sendMousePosition(channel, session.user.id, relativeX, relativeY);
    };

    boardArea.addEventListener("mousemove", handleMouseMove);
    return () => {
      boardArea.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isAuthenticated, channel, session?.user?.id]);

  // Subscribe to cursor broadcasts
  useEffect(() => {
    if (!channel) return;

    channel.on("broadcast", { event: MOUSE_EVENT }, (payload) => {
      receivedCursorPosition(payload as CursorPayload);
    }).subscribe();
  }, [channel]);

  // Supabase channel setup and DB listener
  useEffect(() => {
    if (!isAuthenticated || !room.id) return;

    const client = supabase;
    const roomChannel = client.channel(room.id);
    setChannel(roomChannel);

    client.channel("any")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drawing-rooms" },
        (payload: RealtimePostgresChangesPayload<DrawingRoom>) => {
          if (payload.new && "drawing" in payload.new) {
            setDrawingData(payload.new.drawing);
          }
        }
      )
      .subscribe();
  }, [isAuthenticated, room.id]);

  // Get user session
  useEffect(() => {
    getUserSession().then((sess) => {
      if (sess?.user?.id) {
        setSession(sess);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
  }, []);

  // Initial drawing data
  useEffect(() => {
    if (room.drawing) setDrawingData(room.drawing);
  }, [room.drawing]);

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof document === "undefined") return;

    const sketch = document.querySelector("#sketch");
    if (!sketch) return;

    const sketchStyle = getComputedStyle(sketch);
    canvas.width = parseInt(sketchStyle.getPropertyValue("width"));
    canvas.height = parseInt(sketchStyle.getPropertyValue("height"));

    const mouse = { x: 0, y: 0 };
    const lastMouse = { x: 0, y: 0 };

    const getCanvasOffset = () => {
      const rect = canvas.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = drawingPen.size;
    ctx.strokeStyle = drawingPen.color;

    if (drawingData) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0);
      image.src = drawingData;
    }

    const onPaint = () => {
      ctx.beginPath();
      ctx.moveTo(lastMouse.x, lastMouse.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.closePath();
      ctx.stroke();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const base64ImageData = canvas.toDataURL("image/png");
        updateRoomDrawing(room.id, base64ImageData);
      }, 1000);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvasOffset = getCanvasOffset();
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX - canvasOffset.left;
      mouse.y = e.clientY - canvasOffset.top;
    };

    const handleMouseDown = () => canvas.addEventListener("mousemove", onPaint);
    const handleMouseUp = () => canvas.removeEventListener("mousemove", onPaint);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", onPaint);
    };
  }, [room.id, drawingData, drawingPen.size, drawingPen.color]);

  // Update canvas stroke when pen changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = drawingPen.size;
    ctx.strokeStyle = drawingPen.color;
  }, [drawingPen.size, drawingPen.color]);

  return (
    <div className="my-auto w-full h-full border p-2">
      <div className="w-full h-full relative" id="sketch" ref={boardAreaRef}>
        <div id="container" className="w-full h-full">
          <canvas className="w-full h-full" id="board" ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}

export default WhiteBoard;
