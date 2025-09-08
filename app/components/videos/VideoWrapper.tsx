import React, { useEffect, useState, useCallback } from "react";
import {
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User as StreamUser,
  Call,
} from "@stream-io/video-react-sdk";
import { generateUserVideoToken } from "@/app/services/user.service";
import Spinner from "./Spinner";

// Use the same User type from your page
interface UserMetadata {
  userName?: string;
  userColor?: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: UserMetadata;
}

interface Props {
  children: React.ReactNode;
  userData: User | null; // ✅ matches your page's User type
  callId: string;
}

const VideoWrapper: React.FC<Props> = ({ children, userData, callId }) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  const initVideoCall = useCallback(async () => {
    if (!userData?.id) return;

    try {
      const { token } = await generateUserVideoToken(userData.id);

      const streamUser: StreamUser = {
        id: userData.id,
        name: userData.user_metadata?.userName,
        image: `https://getstream.io/random_svg/?id=${userData.user_metadata?.userName}&name=${userData.user_metadata?.userName}`,
      };

      const videoClient = new StreamVideoClient({
        apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
        user: streamUser,
        token,
      });

      setClient(videoClient);

      const callType = "development";
      const newCall = videoClient.call(callType, callId);
      await newCall.join({ create: true });

      setCall(newCall);
    } catch (error) {
      console.error("Video init error:", error);
    }
  }, [userData, callId]);

  useEffect(() => {
    initVideoCall();
  }, [initVideoCall]);

  if (!client || !call) {
    return (
      <div className="mt-2 h-32 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>{children}</StreamCall>
    </StreamVideo>
  );
};

export default VideoWrapper;
