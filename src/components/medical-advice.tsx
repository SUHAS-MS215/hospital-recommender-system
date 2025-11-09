"use client";

import { AlertTriangle, Shield, Pill, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MedicalAdviceResponse } from "@/lib/api";

interface MedicalAdviceProps {
  advice: MedicalAdviceResponse;
}

export function MedicalAdvice({ advice }: MedicalAdviceProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "emergency":
        return "text-red-600 bg-red-50 border-red-200";
      case "urgent":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "non-emergency":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Severity Badge */}
      <Card className={`p-4 border-2 ${getSeverityColor(advice.severity)}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide">Severity Level</p>
            <p className="text-lg font-bold capitalize">{advice.severity}</p>
          </div>
        </div>
      </Card>

      {/* Precautions */}
      {advice.precautions && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm">Precautions</h3>
          </div>
          <div className="text-sm whitespace-pre-wrap">{advice.precautions}</div>
        </Card>
      )}

      {/* OTC Medications */}
      {advice.otc_medications && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm">Suggested Medications</h3>
          </div>
          <div className="text-sm whitespace-pre-wrap">{advice.otc_medications}</div>
        </Card>
      )}

      {/* Nearby Facilities */}
      {advice.facilities && advice.facilities.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-sm">Nearby Medical Facilities</h3>
          </div>
          <div className="space-y-3">
            {advice.facilities.map((facility, index) => (
              <div key={index} className="pb-3 border-b last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{facility.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{facility.address}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600 shrink-0">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs font-medium">{facility.rating}</span>
                  </div>
                </div>
                {facility.url && (
                  <a 
                    href={facility.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    🔗 View on Map
                  </a>
                )}
                {facility.hours && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⏰ {facility.hours}
                  </p>
                )}
                {facility.reviews && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    💬 {facility.reviews}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

