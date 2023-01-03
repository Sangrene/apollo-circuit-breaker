import { ApolloLink } from "@apollo/client";
import { HttpLink } from "@apollo/client/link/http";
import { onError } from "@apollo/client/link/error";
import {
  CircuitBreakerState,
  CircuitBreakerStateMachine,
  CircuitBreakerStateMachineProps,
} from "./state";
import { RequestAbortedByCircuitBreakerError } from "./errors";

interface CircuitBreakerLinksProps extends CircuitBreakerStateMachineProps {
  recoveryRequestRate: number;
}

const computeShouldSendRequest: {
  [key in CircuitBreakerState]: (recoveryRequestRate: number) => boolean;
} = {
  "half-open": (recoveryRequestRate) => {
    return Math.random() < recoveryRequestRate;
  },
  open: () => false,
  closed: () => true,
};

export const createCircuitBreakerLinks = (p: CircuitBreakerLinksProps) => {
  const manager = new CircuitBreakerStateMachine(p);
  const circuitBreakerLink = new ApolloLink((operation, forward) => {
    // When it goes in
    if (computeShouldSendRequest[manager.getState()](p.recoveryRequestRate)) {
      throw new RequestAbortedByCircuitBreakerError(manager.getState());
    }
    // When it comes out
    return forward(operation).map((data) => {
      manager.handleResponse("success");
      return data;
    });
  });

  const errorLink = onError((error) => {
    const { networkError } = error;
    if (networkError) {
      manager.handleResponse("failure");
    }
  });
  return {
    circuitBreakerLink,
    errorLink,
  };
};

export default createCircuitBreakerLinks;
