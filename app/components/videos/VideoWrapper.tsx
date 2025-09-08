import React, { useEffect, useState, useCallback } from "react";
import {
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  User,
  Call,
} from "@stream-io/video-react-sdk";
import { generateUserVideoToken } from "@/app/services/user.service";
import Spinner from "./Spinner";

// ✅ Only fix the 'any' types, keep everything else the same
interface UserData {
  id: string;
  user_metadata?: {
    userName?: string;
  };
}

interface Props {
  children: React.ReactNode;
  userData: UserData;
  callId: string;
}

const VideoWrapper: React.FC<Props> = (props) => {
  const { children, userData, callId } = props;
  
  // ✅ Replace 'any' with proper types
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  // ✅ Memoize to fix React Hook dependency warning
  const initVideoCall = useCallback(async () => {
    if (!userData?.id) {
      return; // Early return if no user data
    }

    try {
      const { token } = await generateUserVideoToken(userData.id);

      // Set up the user object
      const user: User = {
        id: userData.id,
        name: userData.user_metadata?.userName,
        image: `https://getstream.io/random_svg/?id=${userData.user_metadata?.userName}&name=${userData.user_metadata?.userName}`,
      };

      const video_client = new StreamVideoClient({
        apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
        user,
        token,
      });

      setClient(video_client);
      const callType = "development";
      const call = video_client.call(callType, callId);
      call.join({ create: true });

      setCall(call);
    } catch (error) {
      console.log(error);
    }
  }, [userData, callId]); // ✅ Add proper dependencies

  useEffect(() => {
    if (userData) {
      initVideoCall();
    }
  }, [userData, initVideoCall]); // ✅ Add initVideoCall to dependencies

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