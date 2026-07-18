import type { ComponentProps, CSSProperties, ReactNode } from 'react';

const TABLE_DEFAULT_VARIANT = 'rule';

const cssVar = (name: string, value?: string | number): CSSProperties | undefined =>
  value == null
    ? undefined
    : ({ [name]: typeof value === 'number' ? `${value}px` : value } as CSSProperties);

export const mdxComponents = {
  h2: (props: ComponentProps<'h2'>) => <h2 {...props} />,
  h3: (props: ComponentProps<'h3'>) => <h3 {...props} />,
  h4: (props: ComponentProps<'h4'>) => <h4 {...props} />,
  p: (props: ComponentProps<'p'>) => <p {...props} />,
  a: (props: ComponentProps<'a'>) => (
    <a
      {...props}
      target={props.href?.toString().startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
    />
  ),
  code: (props: ComponentProps<'code'>) => <code {...props} />,
  // Shiki emits lowercase tabindex="0" on code blocks; React wants tabIndex.
  pre: ({ tabindex, ...props }: ComponentProps<'pre'> & { tabindex?: number | string }) => (
    <pre {...props} tabIndex={tabindex != null ? Number(tabindex) : undefined} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => <blockquote {...props} />,
  hr: () => <hr className="article-hr" />,
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
    caption?: string;
    width?: string | number;
    children: ReactNode;
  }) => (
    <div className="inline-figure" style={cssVar('--fig-w', width)}>
      <div>{children}</div>
      {caption && <div className="inline-figure-caption">{caption}</div>}
    </div>
  ),
  Gallery: ({ children, min }: { children: ReactNode; min?: string | number }) => (
    <div className="mdx-gallery" style={cssVar('--gallery-min', min)}>
      {children}
    </div>
  ),
  Table: ({
    variant,
    zebra,
    children,
  }: {
    variant?: string;
    zebra?: boolean;
    children: ReactNode;
  }) => (
    <div
      className={`table-variant table--${variant ?? TABLE_DEFAULT_VARIANT}${zebra ? ' table--zebra' : ''}`}
    >
      {children}
    </div>
  ),
  Video: ({ id, caption, title }: { id: string; caption?: string; title?: string }) => (
    <figure className="video-embed">
      <button
        type="button"
        className="video-embed-play"
        data-video-id={id}
        aria-label={title ? `Play video: ${title}` : 'Play video'}
      >
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="video-embed-icon" aria-hidden="true">
          <svg viewBox="0 0 68 48" width="68" height="48">
            <path
              d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.64 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
              fill="#f00"
            />
            <path d="M45 24 27 14v20" fill="#fff" />
          </svg>
        </span>
      </button>
      {caption && (
        <figcaption className="inline-figure-caption">
          <span
            style={{
              fontStyle: 'normal',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
              marginRight: 8,
            }}
          >
            VIDEO
          </span>
          {caption}
        </figcaption>
      )}
    </figure>
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
