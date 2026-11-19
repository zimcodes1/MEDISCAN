import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./PageStatus";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Shows the error on screen instead of letting a render crash blank the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
