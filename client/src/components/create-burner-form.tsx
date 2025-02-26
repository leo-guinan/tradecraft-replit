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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { TerminalInput } from "./terminal-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Loader2 } from "lucide-react";

const personalityTraits = [
  { name: "Analytical", description: "Methodical and detail-oriented" },
  { name: "Charismatic", description: "Magnetic personality, natural leader" },
  { name: "Strategic", description: "Plans several moves ahead" },
  { name: "Impulsive", description: "Acts on instinct, unpredictable" },
  { name: "Technical", description: "Expert in technological matters" },
  { name: "Diplomatic", description: "Skilled negotiator and mediator" },
];

const backgroundTypes = [
  { name: "Military", description: "Former special forces operative" },
  { name: "Intelligence", description: "Ex-agency field agent" },
  { name: "Academic", description: "Cover as a distinguished professor" },
  { name: "Corporate", description: "High-ranking business executive" },
  { name: "Underworld", description: "Connected to criminal networks" },
  { name: "Diplomatic", description: "International relations specialist" },
];

type WizardStep = "basic" | "personality" | "background" | "preview";

export function CreateBurnerForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("basic");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [traitIntensity, setTraitIntensity] = useState<Record<string, number>>({});
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);

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
      // Enhance personality description with selected traits and intensities
      const personalityDesc = selectedTraits
        .map(trait => `${trait} (${traitIntensity[trait]}%): ${
          personalityTraits.find(t => t.name === trait)?.description
        }`)
        .join("\n");

      // Combine background type with custom background story
      const backgroundDesc = `Type: ${selectedBackground}\n${data.background}`;

      const enhancedData = {
        ...data,
        personality: personalityDesc,
        background: backgroundDesc,
      };

      const res = await apiRequest("POST", "/api/burner-profiles", enhancedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create burner profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/burner-profiles"] });
      onOpenChange(false);
      form.reset();
      setStep("basic");
      setSelectedTraits([]);
      setTraitIntensity({});
      setSelectedBackground(null);
      toast({
        title: "Identity created",
        description: "Your new burner identity is ready for deployment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message === "duplicate key value violates unique constraint \"burner_profiles_codename_unique\""
          ? "This codename is already in use. Please choose another."
          : error.message,
        variant: "destructive",
      });
    },
  });

  const handleTraitToggle = (trait: string) => {
    setSelectedTraits(prev => {
      const isSelected = prev.includes(trait);
      if (isSelected) {
        return prev.filter(t => t !== trait);
      }
      if (prev.length >= 3) {
        toast({
          title: "Maximum traits reached",
          description: "You can only select up to 3 personality traits.",
          variant: "destructive",
        });
        return prev;
      }
      setTraitIntensity(current => ({
        ...current,
        [trait]: 50,
      }));
      return [...prev, trait];
    });
  };

  const renderStep = () => {
    switch (step) {
      case "basic":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="codename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">CODENAME</FormLabel>
                  <FormDescription className="font-mono text-[#990000]">
                    Choose a distinctive identifier for this identity
                  </FormDescription>
                  <FormControl>
                    <TerminalInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "personality":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-mono mb-2">SELECT PERSONALITY TRAITS (MAX 3)</h3>
              <div className="grid grid-cols-2 gap-3">
                {personalityTraits.map(trait => (
                  <Card
                    key={trait.name}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedTraits.includes(trait.name)
                        ? "bg-[#990000] hover:bg-[#880000]"
                        : "bg-[#1a1a1a] hover:bg-[#2a2a2a]"
                    }`}
                    onClick={() => handleTraitToggle(trait.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{trait.name}</span>
                      {selectedTraits.includes(trait.name) && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <p className="text-sm opacity-80">{trait.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            {selectedTraits.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-mono">TRAIT INTENSITY</h3>
                {selectedTraits.map(trait => (
                  <div key={trait} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{trait}</span>
                      <Badge variant="outline">{traitIntensity[trait]}%</Badge>
                    </div>
                    <Slider
                      value={[traitIntensity[trait]]}
                      onValueChange={([value]) =>
                        setTraitIntensity(prev => ({ ...prev, [trait]: value }))
                      }
                      max={100}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "background":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-mono mb-2">SELECT BACKGROUND TYPE</h3>
              <div className="grid grid-cols-2 gap-3">
                {backgroundTypes.map(type => (
                  <Card
                    key={type.name}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedBackground === type.name
                        ? "bg-[#990000] hover:bg-[#880000]"
                        : "bg-[#1a1a1a] hover:bg-[#2a2a2a]"
                    }`}
                    onClick={() => setSelectedBackground(type.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{type.name}</span>
                      {selectedBackground === type.name && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <p className="text-sm opacity-80">{type.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono">BACKGROUND STORY</FormLabel>
                  <FormDescription className="font-mono text-[#990000]">
                    Craft a detailed cover story for this identity
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="font-mono bg-[#0a0a0a] border-[#2a2a2a] text-[#d9d9d9] min-h-[200px]"
                      placeholder="Detail the agent's background, experiences, and connections..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "preview":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-mono text-[#990000]">CODENAME</h3>
              <p className="font-mono">{form.getValues("codename")}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-mono text-[#990000]">PERSONALITY TRAITS</h3>
              <div className="space-y-1">
                {selectedTraits.map(trait => (
                  <div key={trait} className="flex items-center justify-between">
                    <span className="font-mono">{trait}</span>
                    <Badge variant="outline">{traitIntensity[trait]}%</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-mono text-[#990000]">BACKGROUND</h3>
              <Badge className="mb-2">{selectedBackground}</Badge>
              <p className="font-mono whitespace-pre-wrap">
                {form.getValues("background")}
              </p>
            </div>
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (step) {
      case "basic":
        return form.getValues("codename").length > 0;
      case "personality":
        return selectedTraits.length > 0;
      case "background":
        return selectedBackground && form.getValues("background").length > 0;
      case "preview":
        return true;
    }
  };

  const handleNext = () => {
    const steps: WizardStep[] = ["basic", "personality", "background", "preview"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      form.handleSubmit((data) => createBurnerMutation.mutate(data))();
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ["basic", "personality", "background", "preview"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setStep("basic");
          setSelectedTraits([]);
          setTraitIntensity({});
          setSelectedBackground(null);
          form.reset();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-mono">CREATE NEW IDENTITY</DialogTitle>
          <DialogDescription className="font-mono text-[#990000]">
            {step === "basic" && "Step 1: Basic Information"}
            {step === "personality" && "Step 2: Personality Configuration"}
            {step === "background" && "Step 3: Background Development"}
            {step === "preview" && "Step 4: Identity Review"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
            {renderStep()}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="font-mono"
                disabled={step === "basic"}
              >
                Back
              </Button>

              <Button
                type="button"
                className="bg-[#990000] hover:bg-[#cc0000] font-mono"
                onClick={handleNext}
                disabled={!canProceed() || createBurnerMutation.isPending}
              >
                {createBurnerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step === "preview" ? (
                  "CREATE IDENTITY"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}