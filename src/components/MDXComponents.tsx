import type { ComponentProps, ReactNode } from 'react';

// Custom MDX renderers — give blog posts a polished, paper-like default look.

export const mdxComponents = {
  h2: (props: ComponentProps<'h2'>) => <h2 {...props} />,
  h3: (props: ComponentProps<'h3'>) => <h3 {...props} />,
  p: (props: ComponentProps<'p'>) => <p {...props} />,
  a: (props: ComponentProps<'a'>) => (
    <a
      {...props}
      target={props.href?.toString().startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
    />
  ),
  code: (props: ComponentProps<'code'>) => <code {...props} />,
  pre: (props: ComponentProps<'pre'>) => <pre {...props} />,
  blockquote: (props: ComponentProps<'blockquote'>) => <blockquote {...props} />,
  img: ({ alt, src, ...rest }: ComponentProps<'img'>) => {
    if (!alt && typeof process !== 'undefined') {
      console.warn(`[mdx] image missing alt text: ${src}`);
    }
    return <img {...rest} src={src} alt={alt ?? ''} loading="lazy" decoding="async" />;
  },
  // Inline figure helper — usable as <Figure caption="...">...</Figure>
  Figure: ({ caption, children }: { caption: string; children: ReactNode }) => (
    <div className="inline-figure">
      <div>{children}</div>
      <div className="inline-figure-caption">
        <span
          style={{
            fontStyle: 'normal',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            marginRight: 8,
          }}
        >
          FIG.
        </span>
        {caption}
      </div>
    </div>
  ),
  // Callout helper — usable as <Note>... </Note>
  Note: ({ children }: { children: ReactNode }) => (
    <div
      style={{
        margin: '24px 0',
        padding: '16px 20px',
        borderLeft: '2px solid var(--accent)',
        background: 'var(--accent-soft)',
        borderRadius: '0 6px 6px 0',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--accent)',
          marginBottom: 6,
        }}
      >
        Note
      </div>
      <div>{children}</div>
    </div>
  ),
};
