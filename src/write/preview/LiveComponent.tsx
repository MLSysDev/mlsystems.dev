import * as ReactAll from 'react';
import { Component, useMemo, type ComponentType, type ReactNode } from 'react';
import { transform } from 'sucrase';

const reactModule = { ...ReactAll, default: ReactAll, __esModule: true };

export function compileComponent(source: string): { Comp?: ComponentType; error?: string } {
  try {
    const { code } = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'classic',
      production: true,
    });
    const mod: { exports: Record<string, unknown> } = { exports: {} };
    const req = (name: string) => {
      if (name === 'react') return reactModule;
      throw new Error(`import '${name}' isn't available in preview — only 'react' is.`);
    };
    new Function('require', 'module', 'exports', 'React', code)(req, mod, mod.exports, ReactAll);
    const Comp = mod.exports.default as ComponentType | undefined;
    if (typeof Comp !== 'function') return { error: 'No default-exported component found.' };
    return { Comp };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: '' });
  }
  render() {
    if (this.state.error) {
      return <div className="write-live-error">⚠ Component crashed: {this.state.error}</div>;
    }
    return this.props.children;
  }
}

export default function LiveComponent({ name, source }: { name: string; source: string }) {
  const { Comp, error } = useMemo(() => compileComponent(source), [source]);
  if (error) {
    return (
      <div className="write-live-error">
        ⚠ {name || 'Component'}: {error}
      </div>
    );
  }
  if (!Comp) return null;
  return (
    <Boundary resetKey={source}>
      <Comp />
    </Boundary>
  );
}
