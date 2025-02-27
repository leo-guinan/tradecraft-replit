import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClassificationStamp } from "./classification-stamp";
import { 
  ChevronRight, 
  UserPlus, 
  MessageSquare, 
  Search, 
  Shield,
  Check
} from "lucide-react";

const tutorialSteps = [
  {
    title: "WELCOME TO THE AGENCY",
    description: "You've been recruited into a covert social network where identities are fluid and messages are transformed. Your mission, should you choose to accept it, is to master the art of digital disguise.",
    icon: Shield,
  },
  {
    title: "BURNER IDENTITIES",
    description: "Create multiple burner profiles with unique personalities. Each identity comes with AI-powered message transformation to maintain your cover.",
    icon: UserPlus,
  },
  {
    title: "INTELLIGENCE FEED",
    description: "Monitor the intelligence feed to see communications from other agents. Can you identify who's behind each message?",
    icon: MessageSquare,
  },
  {
    title: "IDENTITY ANALYSIS",
    description: "Test your skills by attempting to identify the real agents behind the transformed messages. But remember - incorrect guesses could expose your own tactics.",
    icon: Search,
  },
];

export function TutorialDialog() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const tutorialSeen = localStorage.getItem("tutorialCompleted");
    if (!tutorialSeen) {
      setOpen(true);
      setHasSeenTutorial(false);
    } else {
      setHasSeenTutorial(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const completeTutorial = () => {
    localStorage.setItem("tutorialCompleted", "true");
    setHasSeenTutorial(true);
    setOpen(false);
  };

  const CurrentIcon = tutorialSteps[currentStep]?.icon;

  if (hasSeenTutorial) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-[#d9d9d9] sm:max-w-[600px]">
        <div className="absolute top-4 right-4">
          <ClassificationStamp level="top-secret" className="scale-75" />
        </div>
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2 pt-2">
            {CurrentIcon && <CurrentIcon className="h-5 w-5" />}
            {tutorialSteps[currentStep]?.title}
          </DialogTitle>
          <DialogDescription className="font-mono text-[#990000]">
            BRIEFING {currentStep + 1} OF {tutorialSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="font-mono leading-relaxed">
            {tutorialSteps[currentStep]?.description}
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-1">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-8 rounded-full ${
                    index <= currentStep ? "bg-[#990000]" : "bg-[#2a2a2a]"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="bg-[#990000] hover:bg-[#cc0000] font-mono"
            >
              {currentStep === tutorialSteps.length - 1 ? (
                <>
                  ACCEPT MISSION
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  NEXT BRIEF
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
