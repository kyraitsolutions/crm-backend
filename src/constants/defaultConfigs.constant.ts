export const DEFAULT_CONFIGS = [
  {
    module: "lead",
    configType: "status",
    name: "Lead Statuses",

    values: [
      {
        key: "new",
        label: "New",
        color: "#22C55E",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
      {
        key: "contacted",
        label: "Contacted",
        color: "#3B82F6",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
      {
        key: "proposal",
        label: "Proposal",
        color: "#F59E0B",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
      {
        key: "negotiation",
        label: "Negotiation",
        color: "#FBBF24",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
      {
        key: "closed_won",
        label: "Closed Won",
        color: "#22C55E",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
      {
        key: "closed_lost",
        label: "Closed Lost",
        color: "#EF4444",
        system: true,
        editable: true,
        deletable: false,
        isDefault: true,
        order: 1,
      },
    ],
  },

  {
    module: "conversation",
    configType: "status",
    name: "Conversation Statuses",

    values: [
      {
        key: "open",
        label: "Open",

        system: true,
        deletable: false,
      },

      {
        key: "pending",
        label: "Pending",
        system: true,
        deletable: false,
      },

      {
        key: "closed",
        label: "Closed",

        system: true,
        deletable: false,
      },
    ],
  },
];
