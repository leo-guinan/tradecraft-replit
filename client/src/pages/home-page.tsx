import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { BurnerProfileCard } from "@/components/burner-profile";
import { CreatePost } from "@/components/create-post";
import { PostFeed } from "@/components/post-feed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus, User } from "lucide-react";
import type { BurnerProfile } from "@shared/schema";

export default function HomePage() {
  const { logoutMutation, user } = useAuth();
  const [activeBurnerId, setActiveBurnerId] = useState<number | null>(null);
  const [showAIOnly, setShowAIOnly] = useState(false);

  const { data: burnerProfiles } = useQuery<BurnerProfile[]>({
    queryKey: ["/api/burner-profiles"],
  });

  const activeBurner = burnerProfiles?.find((p) => p.id === activeBurnerId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d9d9d9]">
      <header className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-mono text-xl">FIELD OPERATIONS</h1>
          <div className="flex items-center gap-4">
            {user?.isAdmin && (
              <Button
                variant="ghost"
                className="font-mono"
                onClick={() => window.location.href = "/admin"}
              >
                ADMIN CONSOLE
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="font-mono"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  LOGOUT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-lg">ACTIVE IDENTITIES</h2>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {burnerProfiles?.map((profile) => (
                <BurnerProfileCard
                  key={profile.id}
                  profile={profile}
                  isActive={profile.id === activeBurnerId}
                  onDelete={
                    profile.id === activeBurnerId
                      ? undefined
                      : () => {
                          // Handle delete
                        }
                  }
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {activeBurner ? (
              <CreatePost activeBurner={activeBurner} />
            ) : (
              <div className="text-center p-8 border border-dashed border-[#2a2a2a] rounded-lg">
                <p className="font-mono text-[#990000]">
                  SELECT AN IDENTITY TO BEGIN TRANSMISSION
                </p>
              </div>
            )}

            <Tabs
              defaultValue="all"
              onValueChange={(value) => setShowAIOnly(value === "ai")}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-lg">INTELLIGENCE FEED</h2>
                <TabsList>
                  <TabsTrigger value="all" className="font-mono">
                    ALL
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="font-mono">
                    AI ONLY
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <PostFeed showAIOnly={false} />
              </TabsContent>
              <TabsContent value="ai">
                <PostFeed showAIOnly={true} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
