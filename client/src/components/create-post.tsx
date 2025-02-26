import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BurnerProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
  activeBurner: BurnerProfile;
}

export function CreatePost({ activeBurner }: CreatePostProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/posts", {
        burnerId: activeBurner.id,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Intelligence dispatched",
        description: "Your message has been encrypted and transmitted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transmission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Textarea
            placeholder="Compose intelligence report..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="font-mono bg-[#0a0a0a] border-[#2a2a2a] text-[#d9d9d9] min-h-[100px]"
          />
          <Button
            className="w-full bg-[#990000] hover:bg-[#cc0000] text-white font-mono"
            onClick={() => createPostMutation.mutate(content)}
            disabled={createPostMutation.isPending || !content.trim()}
          >
            Transmit Intel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
