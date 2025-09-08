"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { RoomCard, RoomCardSkeleton } from "./RoomCard";
import NewRoomModal from "./NewRoomModal";
import { fetchUserDrawingRooms } from "@/app/services/drawing-room.service";
import Header from "./Header";
import { Session } from "@/types/session";

export type RoomType = {
  id: string;
  name: string;
  created_at: string;
  isPublic: boolean;
};

type Props = {
  session: Session | null;
};

const DashboardBody: React.FC<Props> = ({ session }) => {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  const [rooms, setRooms] = useState<RoomType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateRoomModal, setShowCreateRoomModal] =
    useState<boolean>(false);

  // Conditions
  const hasNotCreatedARoom = !loading && rooms?.length === 0;
  const hasAtLeastOneRoom = rooms && rooms.length >= 0;
  const shouldShowRoom = !loading && hasAtLeastOneRoom;

  // Stable fetch function
  const loadUserDrawingRooms = useCallback(async (): Promise<void> => {
    if (!session?.user?.id) return;
    const res = await fetchUserDrawingRooms(session.user.id);
    setRooms(res);
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        await loadUserDrawingRooms();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [loadUserDrawingRooms]);

  return (
    <div className="max-w-5xl flex flex-col gap-10 mx-auto px-4 pt-10">
      {isDashboard && (
        <Header
          session={session}
          setShowCreateRoomModal={setShowCreateRoomModal}
        />
      )}

      {hasNotCreatedARoom && (
        <p className="text-slate-600 text-center mt-3">
          Your drawing rooms will display here when you create new rooms.
        </p>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading &&
          Array(5)
            .fill(null)
            .map((_, i) => <RoomCardSkeleton key={i} />)}

        {shouldShowRoom &&
          rooms?.map(({ id, name, created_at, isPublic }) => (
            <RoomCard
              key={id}
              id={id}
              name={name}
              created_at={created_at}
              isPublic={isPublic}
            />
          ))}
      </section>

      <NewRoomModal
        show={showCreateRoomModal}
        setShow={setShowCreateRoomModal}
        loadUserDrawingRooms={loadUserDrawingRooms}
        session={session}
      />
    </div>
  );
};

export default DashboardBody;
