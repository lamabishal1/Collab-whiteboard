"use client";

import React, { useEffect, useState } from "react";
import { fetchUserById, getUserSession } from "../../services/user.service";
import { useParams } from "next/navigation";
import { fetchDrawingRoomById } from "../../services/drawing-room.service";
import Navbar from "../../components/Navbar";
import BoardContainer from "@/app/drawing-room/BoardContainer";
import VideoWrapper from "@/app/components/videos/VideoWrapper";
import VideoLayout from "@/app/components/videos/VideoLayout";

// Define proper types
interface UserMetadata {
  userName?: string;
  userColor?: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: UserMetadata;
}

interface Session {
  user?: User;
  access_token?: string;
  refresh_token?: string;
}

interface Room {
  id: string;
  owner: string;
  isPublic: boolean;
  drawing?: string;
  name?: string;
  createdAt?: string;
  // Add other room properties as needed
}

interface Owner {
  id: string;
  email?: string;
  user_metadata?: UserMetadata;
  // Add other owner properties as needed
}

const DrawingRoomPage = () => {
  const { roomId } = useParams();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [participantCount, setParticipantCount] = useState<number>(0);

  useEffect(() => {
    const loadRoomData = async () => {
      try {
        // Get user session
        const userSession = await getUserSession();
        if (!userSession?.user) {
          window.location.href = "/login";
          return;
        }

        setSession(userSession);
        setUser(userSession.user);

        // Fetch room data
        const roomData = await fetchDrawingRoomById(roomId as string);
        if (!roomData || roomData.length === 0) {
          window.location.href = "/";
          return;
        }

        const roomInfo = roomData[0];
        const canEnterRoom = roomInfo.isPublic || roomInfo.owner === userSession.user.id;

        if (!canEnterRoom) {
          window.location.href = "/";
          return;
        }

        setRoom(roomInfo);
        setIsLoading(false);

        // Fetch room owner information
        const ownerData = await fetchUserById(roomInfo.owner);
        if (ownerData?.user) {
          setOwner(ownerData.user);
        }
      } catch (error) {
        console.error("Error loading room data:", error);
        window.location.href = "/";
      }
    };

    if (roomId) {
      loadRoomData();
    }
  }, [roomId]);

  if (isLoading) {
    return (
      <main>
        <div className='flex justify-center items-center h-screen text-white bg-gradient-to-br from-blue-400 to-green-400'>
          <p>One moment. Please...</p>
        </div>
      </main>
    );
  }

  if (!room || !session) {
    return (
      <main>
        <div className='flex justify-center items-center h-screen text-white bg-gradient-to-br from-blue-400 to-green-400'>
          <p>Room not found or access denied.</p>
        </div>
      </main>
    );
  }

  return (
      <main>
    <Navbar
      session={session}
      owner={owner}
      room={room}
      isRoom
      isLoadingRoom={isLoading}
      participantCount={participantCount}
    />

    <div
      className='relative w-full h-full'
      style={{
        background: "linear-gradient(45deg, #03A9F4, #4CAF50)",
      }}
    >
      {isLoading ? (
        <div className='flex justify-center items-center h-screen text-white'>
          <p>One moment. Please...</p>
        </div>
      ) : (
        <div className='w-full flex flex-col-reverse xl:flex-row'>
          <BoardContainer room={room} />
          <section className='min-w-[15rem] max-w-[15rem] xl:min-h-0 relative mx-auto flex items-center xl:flex-col gap-3 text-white'>
            <VideoWrapper userData={user} callId={room?.id}>
              <VideoLayout setParticipantCount={setParticipantCount} />
            </VideoWrapper>
          </section>
        </div>
      )}
    </div>
  </main>
  );
};

export default DrawingRoomPage;