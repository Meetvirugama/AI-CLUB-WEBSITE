import { useEffect, useState } from "react";
import TeamGlobe from "./TeamGlobe";
import type { Member } from "./Team";
import "./team-page.css";

interface TeamWorldBoxProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  isHomepage?: boolean;
}

export default function TeamWorldBox({
  members,
  onSelectMember,
  isHomepage = false,
}: TeamWorldBoxProps) {
  return (
    <div className="team-world-box-outer">

      <div className="team-world-box">

        {/* =====================================================
            BACKGROUND
        ====================================================== */}

        <div className="team-world-box__bg" />


        {/* =====================================================
            HORIZONTAL CYLINDER ORBITS
        ====================================================== */}

        <div
          className="
            team-world-box__orbit
            team-world-box__orbit--outer
          "
        />

        <div
          className="
            team-world-box__orbit
            team-world-box__orbit--inner
          "
        />


        {/* =====================================================
            AI NETWORK ACTIVITY
        ====================================================== */}

        <div
          className="
            team-world-box__network-glow
          "
        />


        {/* =====================================================
            3D HORIZONTAL CYLINDER
        ====================================================== */}

        <div className="team-world-box__globe">

          <TeamGlobe
            members={members}
            onSelectMember={onSelectMember}
            isHomepage={isHomepage}
          />

        </div>


        {/* =====================================================
            EDGE FADE
        ====================================================== */}

        <div className="team-world-box__vignette" />


        {/* =====================================================
            FRAME
        ====================================================== */}

        <div className="team-world-box__frame" />

      </div>

    </div>
  );
}
