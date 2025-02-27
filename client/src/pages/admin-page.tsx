import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClassificationStamp } from "@/components/classification-stamp";
import { Copy, RefreshCw, Users, MessageSquare, UserPlus, Shield } from "lucide-react";
import type { InviteCode, AdminStats, User, UserDetails } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // Redirect if not admin
  if (user && !user.isAdmin) {
    setLocation("/");
  }

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: selectedUserDetails, isError: detailsError } = useQuery<UserDetails>({
    queryKey: ["/api/admin/users", selectedUser],
    enabled: selectedUser !== null,
  });

  if (detailsError) {
    toast({
      title: "Error",
      description: "Failed to load user details",
      variant: "destructive",
    });
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

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: number; isAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/role`, { isAdmin });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
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
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative">
          <h1 className="text-3xl font-mono">ADMIN CONSOLE</h1>
          <ClassificationStamp
            level="top-secret"
            className="top-0 right-0 transform translate-x-1/4"
          />
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <Users className="h-4 w-4" />
                TOTAL USERS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono text-[#990000]">{stats?.totalUsers || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <Shield className="h-4 w-4" />
                ACTIVE AGENTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono text-[#990000]">{stats?.activeUsers || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                TOTAL POSTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono text-[#990000]">{stats?.totalPosts || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                BURNER PROFILES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono text-[#990000]">
                {stats?.totalBurnerProfiles || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="font-mono">USER MANAGEMENT</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">USERNAME</TableHead>
                  <TableHead className="font-mono">ROLE</TableHead>
                  <TableHead className="font-mono">CREATED</TableHead>
                  <TableHead className="font-mono">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.username}</TableCell>
                    <TableCell className="font-mono">
                      {u.isAdmin ? "ADMIN" : "AGENT"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {new Date(u.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(u.id)}
                        className="font-mono"
                      >
                        VIEW
                      </Button>
                      {user?.id !== u.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateUserRoleMutation.mutate({
                              id: u.id,
                              isAdmin: !u.isAdmin,
                            })
                          }
                          className="font-mono"
                        >
                          {u.isAdmin ? "REVOKE ADMIN" : "MAKE ADMIN"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invite Codes */}
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

      {/* User Details Dialog */}
      <Dialog open={selectedUser !== null} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9]">
              <DialogHeader>
                <DialogTitle className="font-mono">
                  AGENT DETAILS: {selectedUserDetails?.username}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Stats section */}
                <div className="space-y-2">
                  <p className="font-mono text-sm text-[#990000]">STATISTICS</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-mono text-xs">TOTAL POSTS</p>
                      <p className="font-mono text-lg">{selectedUserDetails?.postCount || 0}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs">LAST ACTIVE</p>
                      <p className="font-mono text-lg">
                        {selectedUserDetails?.lastActive
                          ? new Date(selectedUserDetails.lastActive).toLocaleDateString()
                          : "NEVER"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-sm text-[#990000]">BURNER PROFILES</p>
                  <div className="space-y-2">
                    {selectedUserDetails?.burnerProfiles?.length ? (
                      selectedUserDetails.burnerProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="p-3 border border-[#2a2a2a] rounded"
                        >
                          <p className="font-mono">{profile.codename}</p>
                          <p className="font-mono text-xs text-[#990000]">
                            {profile.isActive ? "ACTIVE" : "DEACTIVATED"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 border border-[#2a2a2a] rounded">
                        <p className="font-mono text-[#990000]">NO BURNER PROFILES</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
}