import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ApiError } from "@/lib/apiClient";
import { notify } from "@/lib/notifications";
import { toast } from "@/components/ui/sonner";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineFieldError } from "@/components/common/InlineFieldError";
import { ComponentErrorBoundary } from "@/components/common/ComponentErrorBoundary";

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("Centralized Error Handling Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApiError class and predicates", () => {
    it("handles standard backend error schema and properties", () => {
      const err = new ApiError(404, "Event not found", {
        code: "NOT_FOUND",
        requestId: "req-12345",
        errors: [{ field: "id", message: "Event does not exist" }],
      });

      expect(err.status).toBe(404);
      expect(err.message).toBe("Event not found");
      expect(err.code).toBe("NOT_FOUND");
      expect(err.requestId).toBe("req-12345");
      expect(err.isNotFound).toBe(true);
      expect(err.isNetworkError).toBe(false);
      expect(err.isServerError).toBe(false);
      expect(err.getFieldErrors()).toEqual({ id: "Event does not exist" });
    });

    it("correctly identifies network errors and timeouts", () => {
      const netErr = new ApiError(0, "Unable to connect", { code: "NETWORK_ERROR" });
      expect(netErr.isNetworkError).toBe(true);
      expect(netErr.isTimeout).toBe(false);

      const timeoutErr = new ApiError(504, "Timed out", { code: "TIMEOUT" });
      expect(timeoutErr.isTimeout).toBe(true);
      expect(timeoutErr.isServerError).toBe(true);
    });

    it("identifies validation, auth, and conflict errors", () => {
      const valErr = new ApiError(422, "Invalid input", { code: "VALIDATION_ERROR" });
      expect(valErr.isValidationError).toBe(true);

      const authErr = new ApiError(401, "Please log in", { code: "UNAUTHORIZED" });
      expect(authErr.isAuthError).toBe(true);

      const conflictErr = new ApiError(409, "Already registered", { code: "CONFLICT" });
      expect(conflictErr.isConflict).toBe(true);
    });
  });

  describe("Centralized notifications utility", () => {
    it("delegates to sonner toast.error with formatted details", () => {
      const apiErr = new ApiError(500, "Database connection failed", {
        code: "INTERNAL_SERVER_ERROR",
        requestId: "req-test-99",
      });

      notify.error(apiErr);
      expect(toast.error).toHaveBeenCalledWith(
        "Server Error",
        expect.objectContaining({
          description: expect.stringContaining("req-test-99"),
        })
      );
    });

    it("prevents spamming duplicate error messages within deduplication window", () => {
      notify.error("Duplicate message error test");
      notify.error("Duplicate message error test");

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("supports retry callbacks in toast options", () => {
      const retryMock = vi.fn();
      notify.error("Actionable error test", { retry: retryMock });

      expect(toast.error).toHaveBeenCalledWith(
        "Actionable error test",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Retry",
            onClick: retryMock,
          }),
        })
      );
    });
  });

  describe("ErrorState UI component", () => {
    it("renders title, message, and calls onRetry when clicked", () => {
      const retrySpy = vi.fn();
      render(
        <ErrorState
          title="Could not load events"
          message="Server timed out."
          onRetry={retrySpy}
        />
      );

      expect(screen.getByText("Could not load events")).toBeInTheDocument();
      expect(screen.getByText("Server timed out.")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(retrySpy).toHaveBeenCalledTimes(1);
    });

    it("renders compact mode properly", () => {
      render(
        <ErrorState
          message="Compact error banner"
          compact
        />
      );

      expect(screen.getByText("Compact error banner")).toBeInTheDocument();
    });
  });

  describe("EmptyState UI component", () => {
    it("renders friendly empty message and action CTA", () => {
      const actionSpy = vi.fn();
      render(
        <BrowserRouter>
          <EmptyState
            title="No events found"
            description="Check back next week for upcoming sessions."
            action={{ label: "Explore Past Events", onClick: actionSpy }}
          />
        </BrowserRouter>
      );

      expect(screen.getByText("No events found")).toBeInTheDocument();
      expect(screen.getByText("Check back next week for upcoming sessions.")).toBeInTheDocument();

      const ctaBtn = screen.getByRole("button", { name: /explore past events/i });
      fireEvent.click(ctaBtn);
      expect(actionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("InlineFieldError UI component", () => {
    it("renders nothing when error is null or undefined", () => {
      const { container } = render(<InlineFieldError error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders accessible alert when error is present", () => {
      render(<InlineFieldError error="Email must end with @dau.ac.in" id="email-error" />);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Email must end with @dau.ac.in");
    });
  });

  describe("ComponentErrorBoundary UI component", () => {
    it("catches rendering errors in children and displays fallback card with reset button", () => {
      const BadComponent = () => {
        throw new Error("Deliberate component render crash");
      };

      // Suppress console.error in this test since error boundary intentionally catches it
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const resetMock = vi.fn();
      render(
        <ComponentErrorBoundary fallbackTitle="Custom tab crashed" onReset={resetMock}>
          <BadComponent />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText("Custom tab crashed")).toBeInTheDocument();
      expect(screen.getByText("Deliberate component render crash")).toBeInTheDocument();

      const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(tryAgainBtn);
      expect(resetMock).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });
});
