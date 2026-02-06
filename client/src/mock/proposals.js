// Mock proposal data keyed by tenderId
export const mockProposals = [
  {
    tenderId: "t1",
    bids: [
      {
        id: "b1",
        organization: "Acme Infrastructure Pvt Ltd",
        submittedAt: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 1
        ).toISOString(),
        status: "submitted",
        sections: [
          {
            title: "Executive Summary",
            content: "We propose maintenance with minimal disruption...",
          },
          {
            title: "Methodology",
            content: "Routine patching and resurfacing in 3 phases...",
          },
        ],
        complianceHints:
          "All mandatory documents attached. Clarify warranty duration.",
      },
      {
        id: "b2",
        organization: "UrbanWorks Co.",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        status: "submitted",
        sections: [
          {
            title: "Executive Summary",
            content: "Compliant with all safety norms...",
          },
          {
            title: "Team",
            content: "Experienced civil team with ISO certifications...",
          },
        ],
        complianceHints: "Missing safety training certificate for one role.",
      },
      {
        id: "b3",
        organization: "MetroBuild Ltd",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        status: "submitted",
        sections: [
          {
            title: "Executive Summary",
            content: "Phased approach minimizing lane closures...",
          },
          {
            title: "Schedule",
            content: "8-week plan including night shifts...",
          },
        ],
        complianceHints: "Check insurance coverage validity dates.",
      },
    ],
  },
  {
    tenderId: "t3",
    bids: [
      {
        id: "b4",
        organization: "TechGrid Solutions",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        status: "submitted",
        sections: [
          {
            title: "Architecture",
            content: "Layered network with redundant switches...",
          },
          {
            title: "Compliance",
            content: "Meets ISO 27001, hardware per spec...",
          },
        ],
        complianceHints: "Ensure vendor references are verified.",
      },
    ],
  },
];
