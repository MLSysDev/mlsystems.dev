import type { ComponentProps, CSSProperties, ReactNode } from 'react';

const TABLE_DEFAULT_VARIANT = 'rule';

const cssVar = (name: string, value?: string | number): CSSProperties | undefined =>
  value == null
    ? undefined
    : ({ [name]: typeof value === 'number' ? `${value}px` : value } as CSSProperties);

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
  table: (props: ComponentProps<'table'>) => (
    <div className={`table-wrap table--${TABLE_DEFAULT_VARIANT}`}>
      <table {...props} />
    </div>
  ),
  img: ({ alt, src, ...rest }: ComponentProps<'img'>) => {
    if (!alt && typeof process !== 'undefined') {
      console.warn(`[mdx] image missing alt text: ${src}`);
    }
    return <img {...rest} src={src} alt={alt ?? ''} loading="lazy" decoding="async" />;
  },
  Figure: ({
    caption,
    width,
    children,
  }: {
    caption: string;
    width?: string | number;
    children: ReactNode;
  }) => (
    <div className="inline-figure" style={cssVar('--fig-w', width)}>
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
  Gallery: ({ children, min }: { children: ReactNode; min?: string | number }) => (
    <div className="mdx-gallery" style={cssVar('--gallery-min', min)}>
      {children}
    </div>
  ),
  Table: ({ variant, children }: { variant?: string; children: ReactNode }) => (
    <div className={`table-variant table--${variant ?? TABLE_DEFAULT_VARIANT}`}>{children}</div>
  ),
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
