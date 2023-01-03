import assert from "node:assert";
import test, { describe } from "node:test";
import { CircuitBreakerStateMachine } from "./state";

const later = (delay: number) => {
  return new Promise((res) => {
    setTimeout(res, delay);
  });
};

describe("Circuit breaker state runner", () => {
  test("Open circuit if too much failure in period", async () => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 1,
    });
    c.handleResponse("failure");
    await later(5);
    c.handleResponse("failure");
    assert.strictEqual(c.getState(), "open");
  });
  test("Keep circuit closed if threshold number is not reached", () => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 3,
      retry: 1,
      successThreshold: 2,
      timeout: 1,
    });
    c.handleResponse("failure");
    c.handleResponse("failure");
    assert.strictEqual(c.getState(), "closed");
  });
  test("Keep circuit closed if failure threshold reach but not in threshold period", async () => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 1,
    });
    c.handleResponse("failure");
    await later(15);
    c.handleResponse("failure");
    assert.strictEqual(c.getState(), "closed");
  });

  test("Keep circuit open if opened and getting failure", async () => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 10,
    });
    c.handleResponse("failure");
    await later(6);
    c.handleResponse("failure");
    await later(6);
    c.handleResponse("failure");
    assert.strictEqual(c.getState(), "open");
  });

  test("Set circuit half-opened if open and no failure since timeout", async() => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 5,
    });
    c.handleResponse("failure");
    await later(6);
    c.handleResponse("failure"); // is open here
    await later(6);
    c.handleResponse("success"); // is open here
    assert.strictEqual(c.getState(), "half-open");
  })

  test("Set circut open if half-opened and getting a failure", async() => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 5,
    });
    c.handleResponse("failure");
    await later(6);
    c.handleResponse("failure"); // is open here
    await later(6);
    c.handleResponse("success"); // is half-open here
    c.handleResponse("failure");
    assert.strictEqual(c.getState(), "open");
  });

  test("Close circuit if enough success while half-opened", async() => {
    const c = new CircuitBreakerStateMachine({
      failurePeriodThreshold: 10,
      failureThreshold: 2,
      retry: 1,
      successThreshold: 2,
      timeout: 5,
    });
    c.handleResponse("failure");
    await later(6);
    c.handleResponse("failure"); // is open here
    await later(6);
    c.handleResponse("success");
    await later(6);
    c.handleResponse("success"); // is open here
    assert.strictEqual(c.getState(), "closed");
  });
});
