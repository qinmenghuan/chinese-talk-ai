import { Button } from "@learn-chinese-ai/ui";
import type { UserListItem } from "./users.types";

/* eslint-disable no-unused-vars */
interface UserStatusActionProps {
  user: UserListItem;
  loading: boolean;
  onToggle(user: UserListItem): void;
}
/* eslint-enable no-unused-vars */

export function UserStatusAction({ user, loading, onToggle }: UserStatusActionProps) {
  return (
    <Button
      variant="secondary"
      className="h-9 px-4"
      disabled={loading}
      onClick={() => onToggle(user)}
    >
      {user.status === "active" ? "Disable" : "Enable"}
    </Button>
  );
}
