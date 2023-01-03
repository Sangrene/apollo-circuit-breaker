import { CircuitBreakerState } from "./state";

export class RequestAbortedByCircuitBreakerError extends Error {
  constructor(circuitBreakerState: CircuitBreakerState) {
    super(`Message aborted by circuit breaker being ${circuitBreakerState}`);
  }
}
