import { useFollow } from "@/hooks/useSocialGraph";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Users, Loader2 } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export default function FollowButton({
  targetUserId,
  size = "sm",
  variant = "default",
  className = "",
}: FollowButtonProps) {
  const { following, mutual, loading, toggle } = useFollow(targetUserId);

  if (loading) {
    return (
      <Button size={size} variant="ghost" disabled className={className}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={following ? "outline" : variant}
      onClick={toggle}
      className={className}
    >
      {following ? (
        <>
          {mutual ? <Users className="h-3 w-3 mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
          {mutual ? "Friends" : "Following"}
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}
