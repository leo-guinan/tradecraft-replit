import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassificationStamp } from "@/components/classification-stamp";
import { TutorialDialog } from "@/components/tutorial-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import type { Post, BurnerProfile, User } from "@shared/schema";

export default function PublicFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [guessDialogOpen, setGuessDialogOpen] = useState(false);

  const { data: posts, isLoading } = useQuery<(Post & { burnerProfile: BurnerProfile })[]>({
    queryKey: ["/api/posts"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: guessDialogOpen,
  });

  const makeGuessMutation = useMutation({
    mutationFn: async ({ postId, username }: { postId: number; username: string }) => {
      const res = await apiRequest("POST", "/api/identity-guesses", {
        postId,
        username,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-guesses"] });
      setGuessDialogOpen(false);
      toast({
        title: "Guess submitted",
        description: "Your guess has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit guess",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="pt-6">
              <Skeleton className="h-20 bg-[#2a2a2a]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d9d9d9] p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-mono">INTELLIGENCE FEED</h1>
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-[#990000] hover:bg-[#cc0000] text-white font-mono">
                MISSION CONTROL
              </Button>
            </Link>
          ) : (
            <Link href="/auth">
              <Button className="bg-[#990000] hover:bg-[#cc0000] text-white font-mono">
                LOGIN
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className="relative bg-[#1a1a1a] border-[#2a2a2a]">
              <ClassificationStamp
                level="classified"
                className="top-2 right-2 scale-75 opacity-50"
              />
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="font-mono text-sm text-[#cc0000]">
                    AGENT {post.burnerProfile.codename} // {new Date(post.createdAt).toLocaleString()}
                  </div>
                  <div className="font-mono text-white whitespace-pre-wrap">
                    {post.transformedContent}
                  </div>
                  <div className="pt-4">
                    {user ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPost(post.id);
                          setGuessDialogOpen(true);
                        }}
                        className="font-mono text-[#cc0000] hover:text-[#ff0000] hover:bg-[#2a2a2a]"
                      >
                        IDENTIFY AGENT
                      </Button>
                    ) : (
                      <Link href="/auth">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-[#666666] hover:text-[#999999] hover:bg-[#2a2a2a] cursor-pointer"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          LOGIN TO IDENTIFY
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!posts?.length && (
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardContent className="p-8 text-center">
                <p className="font-mono text-[#cc0000]">NO INTELLIGENCE REPORTS AVAILABLE</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={guessDialogOpen} onOpenChange={setGuessDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="font-mono">SUBMIT IDENTITY GUESS</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;

              if (selectedPost && username) {
                makeGuessMutation.mutate({
                  postId: selectedPost,
                  username,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="font-mono text-sm text-[#cc0000]">
                SUSPECTED USERNAME
              </label>
              <input
                name="username"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2 font-mono text-white"
                placeholder="Enter username..."
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#990000] hover:bg-[#cc0000] font-mono"
            >
              SUBMIT GUESS
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <TutorialDialog />
    </div>
  );
}