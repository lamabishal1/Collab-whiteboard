import { adminAuthClient, supabase } from "../lib/initSupabase";
import { Session } from "@supabase/supabase-js"; 
// User session
export const getUserSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error fetching user session:", error.message);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    console.error("Unexpected error fetching session:", err);
    return null;
  }
};

// User profile
export const fetchUserById = async (userId: string) => {
  try {
    const { data, error } = await adminAuthClient.getUserById(userId);
    if (error) {
      console.error(`Error fetching user ${userId}:`, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`Unexpected error fetching user ${userId}:`, err);
    return null;
  }
};

// User's stream token
export const generateUserVideoToken = async (userId: string) => {
  try {
    const res = await fetch("/api/generate-user-video-instance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      console.error("Failed to generate video token:", res.statusText);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Unexpected error generating video token:", err);
    return null;
  }
};
