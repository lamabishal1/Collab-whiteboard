import React, { useState } from "react";
import { createDrawingRoom } from "@/app/services/drawing-room.service";
import { Session } from "@/types/session"; // ✅ use shared type

type Props = {
  show: boolean;
  setShow: (show: boolean) => void;
  loadUserDrawingRooms: () => Promise<void>;
  session: Session | null;
};

const NewRoomModal: React.FC<Props> = ({
  session,
  show,
  setShow,
  loadUserDrawingRooms,
}) => {
  const [roomName, setRoomName] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);

  return (
    <>
      {show && (
        <div className="fixed w-full inset-0">
          <div
            className="absolute bg-black/50 w-full h-full"
            onClick={() => !isCreatingRoom && setShow(false)} // ✅ now typed
          />
          <div className="flex justify-center items-center h-screen">
            <form
              className="bg-white relative z-10 flex flex-col gap-5 p-5 rounded"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!session?.user?.id) return; // ✅ safety check
                setIsCreatingRoom(true);

                const newRoom = await createDrawingRoom(
                  roomName,
                  session.user.id,
                  isPublic
                );

                await loadUserDrawingRooms();

                if (newRoom && newRoom[0]?.id) {
                  window.location.href = `/room/${newRoom[0].id}`;
                }

                setIsCreatingRoom(false);
              }}
            >
              <h2 className="text-slate-700 text-lg">Create new room</h2>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Room Name"
                  className="border border-slate-300 py-2.5 px-3 rounded"
                  onChange={(e) => setRoomName(e.target.value)}
                  value={roomName}
                  required
                />
              </div>

              <div className="flex gap-1 items-center text-slate-700 text-sm">
                <label>Public</label>
                <input
                  type="checkbox"
                  className="border border-slate-300 rounded"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              </div>

              <button
                className="font-semibold text-sm px-2.5 py-2 rounded-full gap-1 bg-blue-600 text-white hover:bg-blue-500"
                type="submit"
                disabled={isCreatingRoom}
              >
                {isCreatingRoom ? "Please wait..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NewRoomModal;
