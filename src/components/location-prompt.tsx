"use client";

import { MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LocationPromptProps {
  onRequestLocation: () => void;
  error?: string;
  loading?: boolean;
}

export function LocationPrompt({ onRequestLocation, error, loading }: LocationPromptProps) {
  return (
    <Card className="p-6 max-w-md mx-auto my-8">
      <div className="flex flex-col items-center text-center space-y-4">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-lg font-semibold">Location Access Required</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              We need your location to find nearby medical facilities and provide accurate assistance.
            </p>
          </>
        ) : (
          <>
            <MapPin className="w-12 h-12 text-primary" />
            <h3 className="text-lg font-semibold">Enable Location</h3>
            <p className="text-sm text-muted-foreground">
              We need your location to find nearby medical facilities and provide accurate assistance.
            </p>
          </>
        )}
        
        <Button 
          onClick={onRequestLocation} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Getting Location..." : "Allow Location Access"}
        </Button>
      </div>
    </Card>
  );
}

