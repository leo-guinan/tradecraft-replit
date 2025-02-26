import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post, BurnerProfile } from "@shared/schema";
import { ClassificationStamp } from "./classification-stamp";

interface PostFeedProps {
  showAIOnly?: boolean;
}

export function PostFeed({ showAIOnly }: PostFeedProps) {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", { showAIOnly }],
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
                AGENT {post.burnerId} // {new Date(post.createdAt).toLocaleString()}
              </div>
              <div className="font-mono text-[#d9d9d9] whitespace-pre-wrap">
                {post.transformedContent}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
