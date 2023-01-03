export type CircuitBreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerStateMachineProps {
  retry: number; // Number of retry you want perform once failure.

  failureThreshold: number; // maximum no of failed before circuit break
  failurePeriodThreshold: number; // time on which failure should happened before opening the circuit
  successThreshold: number; // maximum success call to close the circuit

  timeout: number; // reset timeout for next call while in open state
}

export class CircuitBreakerStateMachine {
  private state: CircuitBreakerState = "closed";
  private config: CircuitBreakerStateMachineProps;
  private lastFailTime: number | null = null;
  private numberOfRecentFailure = 0;
  private numberOfRecentSuccess = 0;
  private timeSinceOpened: number | null = null;

  constructor(props: CircuitBreakerStateMachineProps) {
    this.config = props;
    console.log("Construct state machine");
  }

  private computeNewstate = (): CircuitBreakerState => {
    const newStateComputation: {
      [key in CircuitBreakerState]: () => CircuitBreakerState;
    } = {
      open: () => {
        if (!this.timeSinceOpened) throw new Error("Time since opened not set");
        if (new Date().getTime() > this.timeSinceOpened + this.config.timeout)
          return "half-open";
        return "open";
      },
      closed: () => {
        if (this.numberOfRecentFailure >= this.config.failureThreshold)
          return "open";
        return "closed";
      },
      "half-open": () => {
        if (this.numberOfRecentFailure > 0) return "open";
        if (this.numberOfRecentSuccess >= this.config.successThreshold)
          return "closed";
        return "half-open";
      },
    };
    return newStateComputation[this.state]();
  };

  private handleSwitchToState: { [key in CircuitBreakerState]: Function } = {
    "half-open": () => {
      this.numberOfRecentFailure = 0;
      this.timeSinceOpened = null;
      this.state = "half-open";
    },
    closed: () => {
      this.numberOfRecentFailure = 0;
      this.timeSinceOpened = null;
      this.state = "closed";
    },
    open: () => {
      this.numberOfRecentSuccess = 0;
      this.state = "open";
      this.timeSinceOpened = new Date().getTime();
    },
  };

  private setState(state: CircuitBreakerState) {
    if (state === this.state) return;
    this.handleSwitchToState[state]();
  }

  handleResponse(status: "success" | "failure") {
    if (status === "success") {
      this.numberOfRecentSuccess++;
    } else {
      if (!this.lastFailTime) {
        this.lastFailTime = new Date().getTime();
      } else if (
        new Date().getTime() >
        this.lastFailTime + this.config.failurePeriodThreshold
      ) {
        this.lastFailTime = new Date().getTime();
        this.numberOfRecentFailure = 0;
      } else {
        this.lastFailTime = new Date().getTime();
      }

      this.numberOfRecentFailure++;
    }
    
    this.setState(this.computeNewstate());
    // console.log({
    //   failure: this.numberOfRecentFailure,
    //   success: this.numberOfRecentSuccess,
    //   state: this.state
    // });
  }

  getState() {
    return this.state;
  }
}
