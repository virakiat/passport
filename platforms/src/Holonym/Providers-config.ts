import { PlatformSpec, PlatformGroupSpec, Provider } from "../types";
import { HolonymGovIdProvider } from "./Providers/holonymGovIdProvider";
import { HolonymPhone } from "./Providers/HolonymPhone";

export const PlatformDetails: PlatformSpec = {
  icon: "./assets/holonymStampIcon.svg",
  platform: "Holonym",
  name: "Holonym",
  description: "Connect to Holonym to verify your identity without revealing any personal information.",
  connectMessage: "Connect Account",
  isEVM: true,
  website: "https://holonym.id/",
};

export const ProviderConfig: PlatformGroupSpec[] = [
  {
    platformGroup: "Holonym KYC",
    providers: [
      { title: "Proven uniqueness using Holonym KYC with government ID or ePassport", name: "HolonymGovIdProvider" },
    ],
  },
  {
    platformGroup: "Phone Number",
    providers: [{ title: "Proven uniqueness using Holonym Phone Verification", name: "HolonymPhone" }],
  },
];

export const providers: Provider[] = [new HolonymGovIdProvider(), new HolonymPhone()];
