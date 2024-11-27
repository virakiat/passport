import { vi, describe, it, expect, Mock } from "vitest";
import { renderHook, act } from "@testing-library/react-hooks";
import { useMintBadge } from "../../hooks/useMintBadge";
import { useIssueAttestation, useAttestationNonce } from "../../hooks/useIssueAttestation";
import { jsonRequest } from "../../utils/AttestationProvider";

const mockIssueAttestation = vi.fn();
const mockFailure = vi.fn();
const mockGoToLastStep = vi.fn();

vi.mock("../../hooks/useIssueAttestation");

vi.mock("../../utils/AttestationProvider");

vi.mock("../../hooks/useMessage", () => ({
  useMessage: () => ({
    failure: mockFailure,
  }),
}));

vi.mock("../../hooks/useNextCampaignStep", () => ({
  useNavigateToLastStep: () => mockGoToLastStep,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0xTestAddress",
  }),
}));

describe("useMintBadge hook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useIssueAttestation).mockReturnValue({
      issueAttestation: mockIssueAttestation,
      needToSwitchChain: false,
    });
    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: 1,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });
  });

  it("handles successful minting", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;
    const testData = { attestation: "testAttestation" };

    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: testNonce,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });
    vi.mocked(jsonRequest).mockResolvedValue({ data: testData });

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(jsonRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        recipient: "0xTestAddress",
      })
    );
    expect(mockIssueAttestation).toHaveBeenCalledWith({ data: testData });
    expect(mockFailure).not.toHaveBeenCalled();
    expect(mockGoToLastStep).toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(true);
  });

  it("shows failure message when nonce is undefined", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];

    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: undefined,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to get the nonce.",
    });
    expect(jsonRequest).not.toHaveBeenCalled();
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("shows failure message when attestation generation returns an error", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;

    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: testNonce,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });
    vi.mocked(jsonRequest).mockResolvedValue({ data: { error: "some error" } } as any);

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(jsonRequest).toHaveBeenCalled();
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while generating attestations.",
    });
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("shows failure message when issueAttestation throws an error", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;
    const testData = { attestation: "testAttestation" };

    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: testNonce,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });
    vi.mocked(jsonRequest).mockResolvedValue({ data: testData } as any);
    mockIssueAttestation.mockRejectedValue(new Error("Attestation failed"));

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(jsonRequest).toHaveBeenCalled();
    expect(mockIssueAttestation).toHaveBeenCalledWith({ data: testData });
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to bring the data onchain.",
    });
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });

  it("handles general exception during onMint", async () => {
    // Arrange
    const testCredentials = [
      {
        credential: "testCredential",
      },
    ];
    const testNonce = 123;

    vi.mocked(useAttestationNonce).mockReturnValue({
      nonce: testNonce,
      isLoading: false,
      isError: false,
      refresh: vi.fn(),
    });

    vi.mocked(jsonRequest).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useMintBadge());

    // Act
    await act(async () => {
      await result.current.onMint({ credentials: testCredentials });
    });

    // Assert
    expect(jsonRequest).toHaveBeenCalled();
    expect(mockIssueAttestation).not.toHaveBeenCalled();
    expect(mockFailure).toHaveBeenCalledWith({
      title: "Error",
      message: "An unexpected error occurred while trying to bring the data onchain.",
    });
    expect(mockGoToLastStep).not.toHaveBeenCalled();

    // Check state updates
    expect(result.current.syncingToChain).toBe(false);
    expect(result.current.badgesFreshlyMinted).toBe(false);
  });
});
