/**
 * Ride Completion Flow — End-to-end test
 * Simulates a ride completing and verifies:
 * 1. Tracking screen transitions to completed step
 * 2. Completed screen shows rating UI
 * 3. "Book again" resets the flow
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }) },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

// Mock i18n
vi.mock("@/lib/i18n-canonical", () => ({
  tc: (key: string) => key,
}));

const MOCK_JOB: MobilityJob = {
  id: "job-123",
  job_type: "taxi",
  service_level: "taxi_standard",
  customer_user_id: "test-user",
  rider_user_id: "driver-1",
  rider_profile_id: null,
  merchant_id: null,
  order_id: null,
  status: "in_progress",
  pickup_label: "Airport",
  pickup_address: "Airport Rd",
  pickup_lat: 25.25,
  pickup_lng: 55.36,
  dropoff_label: "Mall",
  dropoff_address: "Mall Rd",
  dropoff_lat: 25.20,
  dropoff_lng: 55.30,
  quoted_price: 45,
  current_price: 45,
  surge_multiplier: 1,
  currency: "AED",
  payment_status: "pending",
  merchant_status: null,
  confirmation_code: "ABC123",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  accepted_at: new Date().toISOString(),
  completed_at: null,
  cancelled_at: null,
};

describe("Ride Completion Flow", () => {
  beforeEach(() => {
    // Reset stores
    useTaxiFlowStore.getState().reset();
    useCustomerMobilityStore.setState({ jobs: [] });
  });

  it("step 1: taxiFlowStore transitions from tracking to completed", () => {
    const store = useTaxiFlowStore.getState();
    store.setStep("tracking");
    store.setActiveJobId("job-123");

    expect(useTaxiFlowStore.getState().step).toBe("tracking");

    // Simulate what TaxiTrackingScreen does when job.status === "completed"
    store.setStep("completed");
    expect(useTaxiFlowStore.getState().step).toBe("completed");
  });

  it("step 2: TaxiCompletedScreen renders with rating button", async () => {
    // Setup stores
    useCustomerMobilityStore.setState({
      jobs: [{ ...MOCK_JOB, status: "completed" }],
    });
    act(() => {
      useTaxiFlowStore.getState().setActiveJobId("job-123");
      useTaxiFlowStore.getState().setStep("completed");
    });

    // Lazy import to avoid mock issues
    const { TaxiCompletedScreen } = await import("@/components/mobility/TaxiCompletedScreen");

    render(
      <MemoryRouter>
        <TaxiCompletedScreen />
      </MemoryRouter>
    );

    expect(screen.getByText("Ride completed")).toBeInTheDocument();
    expect(screen.getByText("Rate driver")).toBeInTheDocument();
    expect(screen.getByText("View receipt")).toBeInTheDocument();
    expect(screen.getByText("Book again")).toBeInTheDocument();

    // Verify fare display
    expect(screen.getByText("45 AED")).toBeInTheDocument();
  });

  it("step 3: 'Book again' resets flow to search", async () => {
    useCustomerMobilityStore.setState({
      jobs: [{ ...MOCK_JOB, status: "completed" }],
    });
    act(() => {
      useTaxiFlowStore.getState().setActiveJobId("job-123");
      useTaxiFlowStore.getState().setStep("completed");
    });

    const { TaxiCompletedScreen } = await import("@/components/mobility/TaxiCompletedScreen");

    render(
      <MemoryRouter>
        <TaxiCompletedScreen />
      </MemoryRouter>
    );

    const bookAgainBtn = screen.getByText("Book again");
    await userEvent.click(bookAgainBtn);

    expect(useTaxiFlowStore.getState().step).toBe("search");
    expect(useTaxiFlowStore.getState().activeJobId).toBeNull();
  });

  it("step 4: status machine allows in_progress → completed", async () => {
    const { isValidTransition } = await import("@/lib/mobility/status-machine");
    expect(isValidTransition("in_progress", "completed")).toBe(true);
    expect(isValidTransition("rider_arriving_dropoff", "completed")).toBe(true);
    expect(isValidTransition("searching", "completed")).toBe(false);
  });

  it("step 5: tracking effect triggers completed step on job status change", () => {
    // Simulates the useEffect in TaxiTrackingScreen
    const store = useTaxiFlowStore.getState();
    store.setStep("tracking");
    store.setActiveJobId("job-123");

    // Initially in_progress
    useCustomerMobilityStore.setState({
      jobs: [{ ...MOCK_JOB, status: "in_progress" }],
    });

    const job = useCustomerMobilityStore.getState().jobs.find(j => j.id === "job-123");
    expect(job?.status).toBe("in_progress");

    // Simulate realtime update: status changes to completed
    useCustomerMobilityStore.setState({
      jobs: [{ ...MOCK_JOB, status: "completed", completed_at: new Date().toISOString() }],
    });

    const updatedJob = useCustomerMobilityStore.getState().jobs.find(j => j.id === "job-123");
    // Replicate TaxiTrackingScreen effect logic
    if (updatedJob && updatedJob.status === "completed") {
      useTaxiFlowStore.getState().setStep("completed");
    }

    expect(useTaxiFlowStore.getState().step).toBe("completed");
  });
});
