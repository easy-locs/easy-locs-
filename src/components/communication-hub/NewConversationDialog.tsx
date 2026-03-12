/**
 * NewConversationDialog — Create a new direct conversation from the hub.
 * Searches users by name/email and creates a direct thread.
 */
import { useState } from "react";
import { Search, MessageCircle, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated: (contextId: string) => void;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export default function NewConversationDialog({ open, onOpenChange, onThreadCreated }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .neq("id", user?.id || "")
        .limit(10);
      setResults((data || []) as UserResult[]);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handleStartConversation = async (target: UserResult) => {
    if (!user) return;
    setCreating(target.id);
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: target.id,
        targetName: target.name || target.email,
      });
      if (result) {
        onThreadCreated(result.contextId);
        onOpenChange(false);
        setQuery("");
        setResults([]);
        toast.success(`Conversation with ${target.name || target.email} opened`);
      } else {
        toast.error("Could not create conversation");
      }
    } catch (e: any) {
      toast.error(e.message || "Error creating conversation");
    }
    setCreating(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            New Conversation
          </DialogTitle>
          <DialogDescription>Search for a user to start a direct conversation</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="ps-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
            )}
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => handleStartConversation(u)}
                disabled={creating === u.id}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-accent">
                  {(u.name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                {creating === u.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
