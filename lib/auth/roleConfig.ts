export interface RoleDetails {
  label: string;
  description: string;
  registerFields: string[];
  loginMethods: string[];
  redirectPath: string;
}

export const roleConfig: Record<string, RoleDetails> = {
  buyer: {
    label: "Buyer",
    description: "Commercial buyer purchasing commodity lots",
    registerFields: ["fullName", "companyName", "businessType", "email", "mobile", "gstin"],
    loginMethods: ["google", "otp"],
    redirectPath: "/buyer",
  },
  fpo: {
    label: "FPO / Farmer",
    description: "Seller of turmeric crop lots and cooperative producer",
    registerFields: ["fullName", "fpoRegNumber", "mobile", "email", "state", "district", "village"],
    loginMethods: ["google", "otp"],
    redirectPath: "/fpo",
  },
  admin: {
    label: "Admin",
    description: "Internal platform regulator and MahaFPC compliance officer",
    registerFields: [], // invite-only, no public registration form
    loginMethods: ["google", "otp"],
    redirectPath: "/mahafpc",
  },
  escrow: {
    label: "Escrow Service",
    description: "Third-party payment release and ledger verification officer",
    registerFields: [],
    loginMethods: ["google", "otp"],
    redirectPath: "/escrow",
  },
};
