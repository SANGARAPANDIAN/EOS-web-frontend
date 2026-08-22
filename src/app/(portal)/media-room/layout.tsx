import { MediaRoomShell } from "@/modules/media-room/MediaRoomShell";

export default function MediaRoomLayout({ children }: { children: React.ReactNode }) {
  return <MediaRoomShell>{children}</MediaRoomShell>;
}
