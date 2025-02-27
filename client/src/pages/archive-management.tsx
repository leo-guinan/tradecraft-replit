import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, Clock, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassificationStamp } from "@/components/classification-stamp";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface ArchiveData {
  tweets: any[];
  totalTweets: number;
  username: string;
  lastSync?: string;
}

export default function ArchiveManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTweets, setSelectedTweets] = useState<number[]>([]);

  // Redirect if not admin
  if (user && !user.isAdmin) {
    setLocation("/");
  }

  const { data: archiveData, isLoading: archiveLoading } = useQuery<ArchiveData>({
    queryKey: ["/api/admin/archive/tweets", username],
    enabled: !!username,
    queryFn: () => apiRequest("GET", `/api/admin/archive/tweets/${username.toLowerCase()}`).then(res => res.json()),
  });

  const startIngestMutation = useMutation({
    mutationFn: async (data: { username: string, rateLimit: number }) => {
      const res = await apiRequest("POST", "/api/admin/archive/ingest", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ingestion Started",
        description: "Tweet ingestion has been initiated. This may take some time.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archive/status"] });
    },
  });

  const createBurnerMutation = useMutation({
    mutationFn: async (data: {
      username: string,
      selectedTweets: number[],
      postFrequency: string,
      duration: string
    }) => {
      const res = await apiRequest("POST", "/api/admin/archive/create-burner", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Burner Created",
        description: "New burner profile has been created with selected tweets.",
      });
      setShowImportDialog(false);
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d9d9d9] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative">
          <h1 className="text-3xl font-mono">ARCHIVE MANAGEMENT</h1>
          <ClassificationStamp
            level="top-secret"
            className="top-0 right-0 transform translate-x-1/4"
          />
        </div>

        {/* Search Section */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="font-mono">ARCHIVE SEARCH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#0a0a0a] border-[#2a2a2a] font-mono"
              />
              <Button
                onClick={() => setShowImportDialog(true)}
                disabled={!archiveData || archiveLoading}
                className="bg-[#990000] hover:bg-[#cc0000] font-mono"
              >
                <Clock className="h-4 w-4 mr-2" />
                CONFIGURE IMPORT
              </Button>
            </div>

            {archiveLoading && (
              <div className="text-center p-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="font-mono text-[#990000]">SEARCHING ARCHIVES...</p>
              </div>
            )}

            {archiveData && (
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm text-[#990000]">TOTAL TWEETS</p>
                    <p className="font-mono text-2xl">{archiveData.totalTweets}</p>
                  </div>
                  {archiveData.lastSync && (
                    <div>
                      <p className="font-mono text-sm text-[#990000]">LAST SYNC</p>
                      <p className="font-mono">{new Date(archiveData.lastSync).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {archiveData.tweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      className={`p-4 border rounded cursor-pointer ${
                        selectedTweets.includes(tweet.id)
                          ? "border-[#990000] bg-[#990000]/10"
                          : "border-[#2a2a2a] hover:border-[#990000]"
                      }`}
                      onClick={() => {
                        if (selectedTweets.includes(tweet.id)) {
                          setSelectedTweets(selectedTweets.filter(id => id !== tweet.id));
                        } else {
                          setSelectedTweets([...selectedTweets, tweet.id]);
                        }
                      }}
                    >
                      <p className="font-mono text-sm whitespace-pre-wrap">{tweet.text}</p>
                      <p className="font-mono text-xs text-[#666666] mt-2">
                        {new Date(tweet.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Configuration Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9]">
            <DialogHeader>
              <DialogTitle className="font-mono">CONFIGURE IMPORT</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="font-mono text-sm text-[#990000] mb-2">RATE LIMIT</p>
                <select
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2 font-mono text-white"
                  defaultValue="100"
                >
                  <option value="50">50 tweets per minute</option>
                  <option value="100">100 tweets per minute</option>
                  <option value="200">200 tweets per minute</option>
                </select>
              </div>

              <div>
                <p className="font-mono text-sm text-[#990000] mb-2">POST FREQUENCY</p>
                <select
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2 font-mono text-white"
                  defaultValue="daily"
                >
                  <option value="hourly">Every hour</option>
                  <option value="daily">Once per day</option>
                  <option value="weekly">Once per week</option>
                </select>
              </div>

              <div>
                <p className="font-mono text-sm text-[#990000] mb-2">DURATION</p>
                <select
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded p-2 font-mono text-white"
                  defaultValue="30"
                >
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                  <option value="90">3 months</option>
                  <option value="180">6 months</option>
                </select>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => {
                    // Start the ingestion process
                    startIngestMutation.mutate({
                      username,
                      rateLimit: 100 // Get from select
                    });

                    // Create burner profile if tweets are selected
                    if (selectedTweets.length > 0) {
                      createBurnerMutation.mutate({
                        username,
                        selectedTweets,
                        postFrequency: "daily", // Get from select
                        duration: "30" // Get from select
                      });
                    }
                  }}
                  disabled={startIngestMutation.isPending || createBurnerMutation.isPending}
                  className="w-full bg-[#990000] hover:bg-[#cc0000] font-mono"
                >
                  {(startIngestMutation.isPending || createBurnerMutation.isPending) && (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  )}
                  START IMPORT
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
