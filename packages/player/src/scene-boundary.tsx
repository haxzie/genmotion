"use client";

import { Component, type ReactNode } from "react";

export interface SceneRuntimeError {
  sceneId: string;
  sceneName: string;
  message: string;
  stack?: string;
}

interface Props {
  sceneId: string;
  sceneName: string;
  onError?: (error: SceneRuntimeError) => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches runtime errors thrown by AI-generated scene code and shows an error card instead of crashing the player. */
export class SceneErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    this.props.onError?.({
      sceneId: this.props.sceneId,
      sceneName: this.props.sceneName,
      message: error.message,
      stack: error.stack,
    });
  }

  override componentDidUpdate(prevProps: Props) {
    // A new component identity (scene code changed) gets a fresh chance.
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: "#16090b",
            color: "#eb5757",
            fontFamily: "ui-monospace, monospace",
            padding: 80,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 600 }}>
            Scene “{this.props.sceneName}” crashed
          </div>
          <div style={{ fontSize: 28, opacity: 0.8, maxWidth: "80%" }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
