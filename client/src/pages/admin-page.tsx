import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClassificationStamp } from "@/components/classification-stamp";
import { Copy, RefreshCw } from "lucide-react";
import type { InviteCode } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if not admin
  if (user && !user.isAdmin) {
    setLocation("/");
  }

  const { data: inviteCodes } = useQuery<InviteCode[]>({
    queryKey: ["/api/invite-codes"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invite-codes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invite-codes"] });
      toast({
        title: "Invite code generated",
        description: "New invite code has been created.",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied",
      description: "Invite code copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d9d9d9] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="relative">
          <h1 className="text-3xl font-mono">ADMIN CONSOLE</h1>
          <ClassificationStamp
            level="top-secret"
            className="top-0 right-0 transform translate-x-1/4"
          />
        </div>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono">INVITE CODES</CardTitle>
            <Button
              onClick={() => createInviteMutation.mutate()}
              disabled={createInviteMutation.isPending}
              className="bg-[#990000] hover:bg-[#cc0000] font-mono"
            >
              {createInviteMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "GENERATE CODE"
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inviteCodes?.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border border-[#2a2a2a] rounded"
                >
                  <div className="space-y-1">
                    <div className="font-mono">{invite.code}</div>
                    <div className="text-sm text-[#990000] font-mono">
                      {invite.usedById
                        ? `USED: ${new Date(invite.usedAt!).toLocaleDateString()}`
                        : "STATUS: AVAILABLE"}
                    </div>
                  </div>
                  {!invite.usedById && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(invite.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {!inviteCodes?.length && (
                <div className="text-center p-8 border border-dashed border-[#2a2a2a] rounded">
                  <p className="font-mono text-[#990000]">NO ACTIVE CODES</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
