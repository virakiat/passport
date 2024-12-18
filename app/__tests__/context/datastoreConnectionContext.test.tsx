import { vi, describe, it, expect, Mock } from "vitest";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { EthereumWebAuth } from "@didtools/pkh-ethereum";
import { AccountId } from "caip";
import { useEffect, useState } from "react";
import { makeTestCeramicContext } from "../../__test-fixtures__/contextTestHelpers";

import {
  DatastoreConnectionContextProvider,
  useDatastoreConnectionContext,
} from "../../context/datastoreConnectionContext";
import { CeramicContext } from "../../context/ceramicContext";
import { Eip1193Provider } from "ethers";
import { DIDSession } from "did-session";

const mockAddress = "0xfF7edbD01e9d044486781ff52c42EA7a01612644";

vi.mock("axios", () => ({
  get: () => ({
    data: {
      nonce: "123",
    },
  }),
  post: () => ({
    data: {
      access: "456",
    },
  }),
}));

vi.mock("@didtools/pkh-ethereum", () => {
  return {
    EthereumWebAuth: {
      getAuthMethod: vi.fn(),
    },
  };
});

vi.mock("@didtools/cacao", () => ({
  Cacao: {
    fromBlockBytes: () => ({
      p: {
        iss: "did:3:myDid",
      },
    }),
  },
}));

vi.mock("../../context/walletStore", () => {
  return {
    useWalletStore: () => ({
      chain: "eip155:1",
      disconnect: vi.fn(),
    }),
  };
});

const did = {
  createDagJWS: () => ({
    jws: {
      link: {
        bytes: [1, 2, 3, 4],
      },
      payload: "test-payload",
      signatures: ["test-signature"],
    },
    cacaoBlock: "test-cacao-block",
  }),
};

vi.mock("did-session", () => {
  return {
    DIDSession: {
      authorize: () => ({
        serialize: vi.fn(),
        did,
      }),
      fromSession: vi.fn(() => ({
        serialize: vi.fn(),
        did,
      })),
    },
  };
});

const TestingComponent = () => {
  const { connect, dbAccessTokenStatus, dbAccessToken } = useDatastoreConnectionContext();
  const [session, setSession] = useState("");

  useEffect(() => {
    // using https://www.npmjs.com/package/vitest-localstorage-mock to mock localStorage
    setSession(localStorage.getItem("didsession-0xmyAddress") ?? "");
  });

  return (
    <div>
      <div data-testid="session-id">{session}</div>
      <div data-testid="db-access-token-status">Status: {dbAccessTokenStatus}</div>
      <div data-testid="db-access-token">{dbAccessToken}</div>
      <button onClick={() => connect("0xmyAddress", vi.fn() as unknown as Eip1193Provider)}>Connect</button>
    </div>
  );
};

const mockCeramicContext = makeTestCeramicContext({
  passport: {
    issuanceDate: new Date(),
    expiryDate: new Date(),
    stamps: [],
  },
});

describe("<UserContext>", () => {
  const renderTestComponent = () =>
    render(
      <DatastoreConnectionContextProvider>
        <CeramicContext.Provider value={mockCeramicContext}>
          <TestingComponent />
        </CeramicContext.Provider>
      </DatastoreConnectionContextProvider>
    );

  beforeEach(() => {
    localStorage.setItem("connectedWallets", "[]");
  });

  describe.skip("when using multichain", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should use chain id 1 in the DID regardless of the wallet chain", async () => {
      renderTestComponent();

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByTestId("db-access-token-status").textContent).toContain("connected");
      });

      expect(EthereumWebAuth.getAuthMethod as Mock).toHaveBeenCalledWith(
        expect.anything(),
        new AccountId({ address: mockAddress, chainId: "eip155:1" })
      );
    });

    it("should reuse existing DIDsession when applicable", async () => {
      localStorage.setItem("didsession-0xmyAddress", "eyJzZXNzaW9uS2V5U2VlZCI6IlF5cTN4aW9ubGxD...");

      renderTestComponent();

      screen.getByRole("button").click();

      await waitFor(() => {
        expect(screen.getByTestId("db-access-token-status").textContent).toContain("connected");
      });

      await waitFor(() => {
        expect(DIDSession.fromSession as Mock).toHaveBeenCalled();
      });
    });
  });
});
