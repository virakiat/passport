import { useAccount } from "wagmi";
import { useNavigateToGithubConnectStep, useNavigateToRootStep } from "../../hooks/useNextCampaignStep";
import { useDatastoreConnectionContext } from "../../context/datastoreConnectionContext";
import { useScrollBadge } from "../../hooks/useScrollBadge";
import { useMessage } from "../../hooks/useMessage";
import { useEffect } from "react";
import { MobileBackgroundImage, ScrollCampaignPageRoot } from "./ScrollLayout";
import { badgeContractInfo, scrollCampaignChain } from "../../config/scroll_campaign";
import { LoadButton } from "../LoadButton";
import { ProviderWithTitle } from "../ScrollCampaign";
import { PROVIDER_ID } from "@gitcoin/passport-types";

export const getHighestEarnedBadgeProviderInfo = (contractAddress: string, level: number) => {
  const badgeContract = badgeContractInfo.find((contract) => contract.badgeContractAddress === contractAddress);
  if (badgeContract) {
    return badgeContract.providers.reduce<ProviderWithTitle>(
      (acc, provider) => {
        if (provider.level <= level && provider.level > acc.level) {
          acc = { title: badgeContract.title, ...provider };
        }
        return acc;
      },
      {
        title: "",
        name: "No Provider" as PROVIDER_ID,
        image: "",
        level: 0,
      }
    );
  }
};

export const RenderedBadges = ({ badges }: { badges: ProviderWithTitle[] }) => (
  <>
    {badges.map((badge, index) => (
      <div key={index} className={`flex flex-col items-center ${badges.length != 2 && "even:mb-10"} w-20 md:w-auto`}>
        <img
          src={badge.image}
          alt={`Badge Level ${badge.level}`}
          className="w-24 md:w-32 h-20 md:h-32 object-contain"
        />
        <div className="mt-2 text-sm lg:text-lg font-semibold">{badge.title}</div>
        <div className="text-sm">Level: {badge.level}</div>
      </div>
    ))}
  </>
);

export const ScrollMintedBadge = ({ badgesFreshlyMinted }: { badgesFreshlyMinted: boolean }) => {
  const goToLoginStep = useNavigateToRootStep();
  const goToGithubConnectStep = useNavigateToGithubConnectStep();
  const { address } = useAccount();
  const { did, dbAccessToken } = useDatastoreConnectionContext();
  const { badges, areBadgesLoading, errors, hasAtLeastOneBadge } = useScrollBadge(address);
  const { failure } = useMessage();

  useEffect(() => {
    if (!dbAccessToken || !did) {
      console.log("Access token or did are not present. Going back to login step!");
      goToLoginStep();
    }
  }, [dbAccessToken, did, goToLoginStep]);

  useEffect(() => {
    if (!areBadgesLoading && !hasAtLeastOneBadge) {
      goToGithubConnectStep();
    }
  }, [areBadgesLoading, hasAtLeastOneBadge, goToGithubConnectStep]);

  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([key, value]) => {
        failure({
          title: `Error ${key}`,
          message: value,
        });
      });
    }
  }, [errors, failure]);

  return (
    <ScrollCampaignPageRoot>
      <div className="flex grow mx-8 md:mx-10 py-10 md:py-0">
        <div className="flex flex-col min-h-screen mt-16 lg:mt-0 justify-start lg:justify-center items-center shrink-0 grow w-1/2 text-center">
          <div className="mb-10">
            {badgesFreshlyMinted ? (
              <div className="text-3xl lg:text-5xl text-[#FFEEDA]">Badges minted!</div>
            ) : (
              <div className="text-3xl lg:text-5xl text-[#FFEEDA]">You Already Minted All Eligible Badges!</div>
            )}
            {badgesFreshlyMinted && (
              <p>
                You can see your badges on your{" "}
                <a
                  className="underline text-[#93FBED]"
                  href="https://scroll.io/canvas/mint"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Scroll Canvas
                </a>
                , and you can also check the attestation{" "}
                <a
                  href={scrollCampaignChain?.attestationProvider?.viewerUrl(address!) ?? ""}
                  className="underline text-[#93FBED]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  here
                </a>
                .
              </p>
            )}
          </div>
          {areBadgesLoading ? (
            <div>Loading badges...</div>
          ) : badges.length === 0 ? (
            <div>No badges found.</div>
          ) : (
            <div className="flex flex-wrap justify-center items-end gap-8 w-full">
              <RenderedBadges
                badges={
                  badges
                    ? badges
                        .filter((badge) => badge.hasBadge)
                        .map((badge) => getHighestEarnedBadgeProviderInfo(badge.contract, badge.badgeLevel))
                        .filter((badge): badge is ProviderWithTitle => badge !== null)
                    : []
                }
              />
            </div>
          )}
          <LoadButton
            data-testid="canvasRedirectButton"
            variant="custom"
            onClick={() => {
              window.open("https://scroll.io/canvas", "_blank", "noopener,noreferrer");
            }}
            className="text-color-1 text-lg border-2 border-white hover:brightness-150 py-3 transition-all duration-100 pl-3 pr-5 m-10 w-full md:w-3/4 lg:w-auto z-10"
          >
            My Canvas
          </LoadButton>
        </div>
      </div>
      <MobileBackgroundImage />
    </ScrollCampaignPageRoot>
  );
};
