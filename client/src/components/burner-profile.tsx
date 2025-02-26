import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2 } from "lucide-react";
import type { BurnerProfile } from "@shared/schema";
import { ClassificationStamp } from "./classification-stamp";

interface BurnerProfileCardProps {
  profile: BurnerProfile;
  onDelete?: () => void;
  isActive?: boolean;
}

export function BurnerProfileCard({ profile, onDelete, isActive }: BurnerProfileCardProps) {
  return (
    <Card className="relative bg-[#1a1a1a] border-[#2a2a2a]">
      <ClassificationStamp level="confidential" className="top-2 right-2 scale-75" />

      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#990000]" />
            <h3 className="font-mono text-lg text-[#d9d9d9]">{profile.codename}</h3>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-[#990000] hover:text-[#cc0000]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="font-mono text-sm text-[#d9d9d9] opacity-80">
          <span className="text-[#990000]">[PERSONALITY]</span> {profile.personality}
        </div>
        <div className="font-mono text-sm text-[#d9d9d9] opacity-80">
          <span className="text-[#990000]">[BACKGROUND]</span> {profile.background}
        </div>
        {isActive && (
          <div className="mt-4">
            <span className="px-2 py-1 bg-[#990000] text-[#d9d9d9] text-xs font-mono rounded">
              ACTIVE AGENT
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}