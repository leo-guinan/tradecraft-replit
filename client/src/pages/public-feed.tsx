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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { useState } from "react";
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
    mutationFn: async ({ postId, guessedUserId }: { postId: number; guessedUserId: number }) => {
      const res = await apiRequest("POST", "/api/identity-guesses", {
        postId,
        guessedUserId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-guesses"] });
      setGuessDialogOpen(false);
      toast({
        title: data.isCorrect ? "Correct guess!" : "Incorrect guess",
        description: data.isCorrect
          ? "You successfully identified the author!"
          : "Keep trying to identify the real person behind the message.",
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
        <div className="relative">
          <h1 className="text-3xl font-mono">INTELLIGENCE FEED</h1>
          <ClassificationStamp
            level="classified"
            className="top-0 right-0 transform translate-x-1/4"
          />
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
                  <div className="font-mono text-sm text-[#990000]">
                    AGENT {post.burnerProfile.codename} // {new Date(post.createdAt).toLocaleString()}
                  </div>
                  <div className="font-mono text-[#d9d9d9] whitespace-pre-wrap">
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
                        className="font-mono text-[#990000] hover:text-[#cc0000]"
                      >
                        IDENTIFY AGENT
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="font-mono text-[#2a2a2a] cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        LOGIN TO IDENTIFY
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={guessDialogOpen} onOpenChange={setGuessDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9]">
          <DialogHeader>
            <DialogTitle className="font-mono">IDENTIFY AGENT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-mono text-sm text-[#990000]">
              SELECT THE SUSPECTED REAL IDENTITY
            </p>
            <div className="grid grid-cols-2 gap-2">
              {users?.map((u) => (
                <Button
                  key={u.id}
                  variant="outline"
                  className="font-mono"
                  onClick={() => {
                    if (selectedPost) {
                      makeGuessMutation.mutate({
                        postId: selectedPost,
                        guessedUserId: u.id,
                      });
                    }
                  }}
                >
                  {u.username}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
