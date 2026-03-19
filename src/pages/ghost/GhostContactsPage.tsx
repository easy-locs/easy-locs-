/**
 * GhostContactsPage — Ghost contact list / invite management.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, QrCode, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function GhostContactsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/inbox")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Ghost Contacts</h1>
      </div>

      <div className="p-4 text-center py-12">
        <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">No ghost contacts yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1 mb-4">Share a Ghost QR to add contacts</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm">
            <QrCode className="w-3 h-3 mr-1" /> Share QR
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="w-3 h-3 mr-1" /> Invite
          </Button>
        </div>
      </div>
    </div>
  );
}
