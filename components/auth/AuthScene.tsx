"use client";

import { Fit } from "@/components/marketing/Fit";
import { CreatorsScene, DevelopersScene, TeamsScene } from "@/components/marketing/WhoFor";

/** The homepage's live product scenes, sized for the auth side panel. */
export function AuthScene({ scene }: { scene: "creators" | "teams" | "developers" }) {
  return (
    <Fit minWidth={540} height={480}>
      <div className="relative h-full">
        {scene === "creators" ? <CreatorsScene /> : scene === "teams" ? <TeamsScene /> : <DevelopersScene />}
      </div>
    </Fit>
  );
}
