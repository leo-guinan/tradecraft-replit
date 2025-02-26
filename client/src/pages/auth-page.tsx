import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TerminalInput } from "@/components/terminal-input";
import { ClassificationStamp } from "@/components/classification-stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const authSchema = insertUserSchema.extend({
  inviteCode: z.string().min(1, "Invite code is required"),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
      inviteCode: "",
    },
  });

  const loginForm = useForm<Omit<AuthFormData, "inviteCode">>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="relative">
            <h1 className="text-4xl font-mono text-[#d9d9d9]">
              Creator Insurance Agency
            </h1>
            <ClassificationStamp
              level="top-secret"
              className="top-0 right-0 transform translate-x-1/4"
            />
          </div>
          <p className="text-[#d9d9d9] font-mono opacity-80">
            They're watching your metrics.
            <br />
            Who's watching your back?
          </p>
        </div>

        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="font-mono text-[#d9d9d9]">
              AGENT AUTHORIZATION
            </CardTitle>
            <CardDescription className="font-mono text-[#990000]">
              CLEARANCE REQUIRED
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">LOGIN</TabsTrigger>
                <TabsTrigger value="register">REGISTER</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((data) =>
                      loginMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
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
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono">PASSPHRASE</FormLabel>
                          <FormControl>
                            <TerminalInput type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-[#990000] hover:bg-[#cc0000] font-mono"
                      disabled={loginMutation.isPending}
                    >
                      AUTHENTICATE
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      registerMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="username"
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
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono">PASSPHRASE</FormLabel>
                          <FormControl>
                            <TerminalInput type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono">INVITE CODE</FormLabel>
                          <FormControl>
                            <TerminalInput {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-[#990000] hover:bg-[#cc0000] font-mono"
                      disabled={registerMutation.isPending}
                    >
                      INITIATE CLEARANCE
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
