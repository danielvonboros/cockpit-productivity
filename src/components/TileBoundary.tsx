import { Component, type ReactNode } from 'react';

interface TileBoundaryProps {
  label: string;
  children: ReactNode;
}

/** One broken tile must never blank the whole new-tab page */
export class TileBoundary extends Component<TileBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="tile tile--failed" aria-label={this.props.label}>
        <h2 className="label">{this.props.label}</h2>
        <p className="empty">Diese Kachel hatte ein Problem. Deine Daten sind sicher.</p>
        <button type="button" className="btn" onClick={() => this.setState({ failed: false })}>
          Erneut versuchen
        </button>
      </section>
    );
  }
}
