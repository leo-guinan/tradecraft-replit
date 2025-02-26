import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBurnerProfileSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TerminalInput } from "./terminal-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CreateBurnerForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertBurnerProfileSchema),
    defaultValues: {
      codename: "",
      personality: "",
      background: "",
      avatar: "default-avatar.png", // Placeholder
    },
  });

  const createBurnerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/burner-profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/burner-profiles"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Identity created",
        description: "Your new burner identity is ready for deployment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9]">
        <DialogHeader>
          <DialogTitle className="font-mono">CREATE NEW IDENTITY</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createBurnerMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="codename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">CODENAME</FormLabel>
                  <FormControl>
                    <TerminalInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">PERSONALITY TRAITS</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="font-mono bg-[#0a0a0a] border-[#2a2a2a] text-[#d9d9d9]"
                      placeholder="Detail the personality characteristics..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">BACKGROUND STORY</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="font-mono bg-[#0a0a0a] border-[#2a2a2a] text-[#d9d9d9]"
                      placeholder="Provide the cover story and background..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-[#990000] hover:bg-[#cc0000] font-mono"
              disabled={createBurnerMutation.isPending}
            >
              CREATE IDENTITY
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
