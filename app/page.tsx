"use client";

import Navbar from "./components/Navbar";
import { useEffect, useState } from "react";
import { getUserSession } from "./services/user.service";
import { supabase } from "./lib/initSupabase";
import DashboardBody from "./components/dashboard/DashboardBody";

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

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);

  function generateUserColor(): string {
    const colors = [
      "#3b82f6",
      "#14b8a6",
      "#f87171",
      "#eab308",
      "#a855f7",
      "#6366f1",
    ];
    const index = Math.floor(Math.random() * colors.length);
    return colors[index];
  }

  function createUsernameFromEmail(email: string): string {
    try {
      const username = email?.split("@")[0];
      if (!username) {
        throw new Error("Invalid email format");
      }
      return username;
    } catch (error) {
      throw new Error("Error occurred while creating username: " + error);
    }
  }

  useEffect(() => {
    getUserSession()
      .then(async (session) => {
        if (session?.user) {
          // First time user (don't have username and color)
          const isNewUser =
            !session.user.user_metadata?.userName &&
            !session.user.user_metadata?.userColor;

          if (isNewUser && session.user.email) {
            const userName = createUsernameFromEmail(session.user.email);
            const userColor = generateUserColor();
            
            try {
              // Update user metadata in Supabase
              await supabase.auth.updateUser({
                data: { userName, userColor },
              });

              // Create updated session object
              const updatedSession: Session = {
                ...session,
                user: {
                  ...session.user,
                  user_metadata: {
                    ...session.user.user_metadata,
                    userName,
                    userColor,
                  },
                },
              };

              setSession(updatedSession);
            } catch (error) {
              console.error("Error updating user metadata:", error);
              setSession(session); // Set original session if update fails
            }
          } else {
            // Returning user
            setSession(session);
          }
          
          setIsAuthenticating(false);
        } else {
          // No session, redirect to login
          window.location.href = "/login";
        }
      })
      .catch((error) => {
        console.error("Error occurred while fetching user session:", error);
        setIsAuthenticating(false);
        window.location.href = "/login";
      });
  }, []);

  if (isAuthenticating) {
    return (
      <div className='min-h-screen flex justify-center items-center'>
        <p>Validating session. Please wait...</p>
      </div>
    );
  }

  console.log(session); // currently logged in user object

  return (
    <main>
      <Navbar session={session} />
      <DashboardBody session={session} />
    </main>
  );
}