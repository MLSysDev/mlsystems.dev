import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AllSelection, TextSelection } from 'prosemirror-state';
import { filterSuggestionItems } from '@blocknote/core';
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  blockTypeSelectItems,
  useCreateBlockNote,
  useEditorSelectionChange,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import 'katex/dist/katex.min.css';
import { schema } from './editor/schema';
import { getSlashItems } from './editor/slashMenu';
import { MetaForm, type Option } from './meta/MetaForm';
import { serializePost, type PostMeta, type SBlock, type TableStyle } from './serialize/toMdx';
import { validate } from './serialize/validate';
import { buildZip } from './serialize/toZip';
import { buildSource } from './serialize/source';
import { fetchExisting } from './serialize/fetchExisting';
import {
  assemblePostFiles,
  createPullRequest,
  isConfigured as isGithubConfigured,
} from './publish/github';
import { allAssets, clearAssets } from './storage/assets';
import {
  clearDraft,
  clearStoredAssets,
  loadDraft,
  restoreAssets,
  saveDraftDebounced,
} from './storage/drafts';
import './editor/editor-theme.css';

const BORDER_VARIANTS: TableStyle['border'][] = ['rule', 'lined', 'plain'];
const DEFAULT_TABLE_STYLE: TableStyle = { border: 'rule', zebra: false };

function tableVariantCss(variants: Record<string, TableStyle>): string {
  return Object.entries(variants)
    .map(([id, style]) => {
      if (!style || typeof style !== 'object') return '';
      const sel = `.bn-editor [data-id="${id}"] [data-content-type='table']`;
      const rules: string[] = [];
      if (style.border === 'lined') {
        rules.push(
          `${sel} :is(td, th) { border: 1px solid var(--line); padding-left: 12px; padding-right: 12px; }`,
        );
      }
      if (style.border === 'plain') {
        rules.push(`${sel} tr:not(:first-child) > * { border-bottom: none; }`);
      }
      if (style.zebra) {
        rules.push(
          `${sel} tr:not(:first-child):nth-child(odd) > * { background: var(--paper-2); }`,
        );
      }
      return rules.join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

type Props = {
  authors: Option[];
  topics: Option[];
  repoUrl: string;
  contactEmail: string;
};

function collectImages(blocks: SBlock[]): string[] {
  const out: string[] = [];
  const walk = (list: SBlock[]) => {
    for (const b of list) {
      if (b.type === 'figure' && b.props.fileName) out.push(String(b.props.fileName));
      if (b.type === 'gallery') {
        try {
          out.push(...(JSON.parse(String(b.props.fileNames || '[]')) as string[]));
        } catch {
          // ignore a malformed gallery — it just won't offer cover options
        }
      }
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  return [...new Set(out.filter(Boolean))];
}

function isEmptyDraft(meta: PostMeta, blocks: SBlock[]): boolean {
  const metaEmpty =
    !meta.title.trim() && !meta.summary.trim() && !meta.slug.trim() && meta.tags.length === 0;
  const blocksEmpty = blocks.every(
    (b) => b.type === 'paragraph' && (!Array.isArray(b.content) || b.content.length === 0),
  );
  return metaEmpty && blocksEmpty;
}

function emptyMeta(): PostMeta {
  return {
    title: '',
    summary: '',
    authors: [],
    writerName: '',
    topicId: '',
    topicName: '',
    tags: [],
    slug: '',
    coverFileName: '',
    proposedTopic: '',
  };
}

export default function WritePortal({ authors, topics, repoUrl, contactEmail }: Props) {
  const editor = useCreateBlockNote({ schema });
  const [meta, setMeta] = useState<PostMeta>(() => emptyMeta());
  const [tableVariants, setTableVariants] = useState<Record<string, TableStyle>>({});
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [barPos, setBarPos] = useState<{ top: number; left: number } | null>(null);
  const [restore, setRestore] = useState<null | { savedAt: number }>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [storageOff, setStorageOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentFile, setSentFile] = useState<string | null>(null);
  const [siteTheme, setSiteTheme] = useState<'light' | 'dark'>('light');
  const [openError, setOpenError] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const githubEnabled = isGithubConfigured();
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStage, setPublishStage] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const variantCss = useMemo(() => tableVariantCss(tableVariants), [tableVariants]);
  const images = collectImages(editor.document as unknown as SBlock[]);

  const oversizedIssues = (): string[] => {
    const big = allAssets()
      .filter((a) => a.file.size > 5 * 1024 * 1024)
      .map((a) => a.name);
    return big.length
      ? [`These images are over 5 MB — please resize before publishing: ${big.join(', ')}`]
      : [];
  };

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setSiteTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && !isEmptyDraft(draft.meta, draft.blocks)) setRestore({ savedAt: draft.savedAt });
  }, []);

  useEffect(() => {
    if (!currentTableId) {
      setBarPos(null);
      return;
    }
    const update = () => {
      const el = document.querySelector<HTMLElement>(
        `.bn-block-outer[data-id="${currentTableId}"]`,
      );
      if (!el) {
        setBarPos(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const above = r.top - 52;
      setBarPos({ top: above < 76 ? r.bottom + 10 : above, left: r.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [currentTableId]);

  const getDraft = useCallback(
    () => ({
      meta,
      blocks: editor.document as unknown as SBlock[],
      tableVariants,
      savedAt: Date.now(),
    }),
    [editor, meta, tableVariants],
  );

  const autosave = useCallback(() => {
    if (restore) return;
    setSentFile(null);
    if (isEmptyDraft(meta, editor.document as unknown as SBlock[])) return;
    saveDraftDebounced(getDraft, () => setStorageOff(true));
  }, [getDraft, restore, editor, meta]);

  useEditorSelectionChange(() => {
    try {
      const sel = editor.getSelection();
      if (sel && sel.blocks.length !== 1) {
        setCurrentTableId(null);
        return;
      }
      const block = editor.getTextCursorPosition().block;
      setCurrentTableId(block?.type === 'table' ? block.id : null);
    } catch {
      setCurrentTableId(null);
    }
  }, editor);

  const acceptRestore = async () => {
    const draft = loadDraft();
    if (draft) {
      await restoreAssets().catch(() => setStorageOff(true));
      editor.replaceBlocks(editor.document, draft.blocks as never);
      // Migrate legacy single-author drafts to the authors[] shape.
      const legacy = draft.meta as PostMeta & { author?: string };
      setMeta({
        ...draft.meta,
        authors: Array.isArray(draft.meta.authors)
          ? draft.meta.authors
          : legacy.author
            ? [legacy.author]
            : ['guest'],
      });
      setTableVariants(draft.tableVariants ?? {});
    }
    setRestore(null);
  };

  const discardRestore = async () => {
    clearDraft();
    await clearStoredAssets().catch(() => undefined);
    setRestore(null);
  };

  const openExisting = async () => {
    const input = openUrl.trim();
    if (!input) return;
    setOpenError(null);
    setBusy(true);
    try {
      clearAssets();
      const loaded = await fetchExisting(repoUrl, input);
      await clearStoredAssets().catch(() => undefined);
      setRestore(null);
      setSentFile(null);
      setIssues([]);
      editor.replaceBlocks(editor.document, loaded.blocks as never);
      setMeta({
        ...emptyMeta(),
        ...loaded.meta,
        authors: Array.isArray(loaded.meta.authors) ? loaded.meta.authors : [],
      });
      setTableVariants(loaded.tableVariants ?? {});
      setLoadedSlug(loaded.meta.slug || null);
      setOpenUrl('');
      setOpenDialog(false);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'That post could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const blocks = editor.document as unknown as SBlock[];
    const found = [...validate(meta, blocks), ...oversizedIssues()];
    setIssues(found);
    if (found.length > 0) return;
    setBusy(true);
    try {
      const serialized = serializePost(meta, blocks, { tableVariants, today: new Date() });
      const blob = await buildZip({
        serialized,
        slug: meta.slug,
        writerName: meta.writerName,
        repoUrl,
        contactEmail,
        assets: allAssets(),
        sourceJson: buildSource(meta, blocks, tableVariants),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      clearDraft();
      await clearStoredAssets().catch(() => undefined);
      setSentFile(`${meta.slug}.zip`);
    } catch {
      setIssues(['Something went wrong while packaging your post. Please try downloading again.']);
    } finally {
      setBusy(false);
    }
  };

  const openPublish = () => {
    const blocks = editor.document as unknown as SBlock[];
    const found = [...validate(meta, blocks), ...oversizedIssues()];
    setIssues(found);
    if (found.length > 0) return;
    setPublishError(null);
    setPrUrl(null);
    setPublishStage('idle');
    setPublishOpen(true);
  };

  const submitToGithub = async () => {
    const blocks = editor.document as unknown as SBlock[];
    setPublishStage('working');
    setPublishError(null);
    try {
      const serialized = serializePost(meta, blocks, { tableVariants, today: new Date() });
      const sourceJson = buildSource(meta, blocks, tableVariants);
      const files = await assemblePostFiles(meta.slug, serialized, sourceJson, allAssets());
      const pr = await createPullRequest({
        slug: meta.slug,
        title: meta.title || 'Untitled',
        files,
        isEdit: loadedSlug !== null && loadedSlug === meta.slug,
      });
      setPrUrl(pr.url);
      setPublishStage('done');
      clearDraft();
      await clearStoredAssets().catch(() => undefined);
    } catch (err) {
      setPublishStage('error');
      setPublishError(err instanceof Error ? err.message : 'Could not create the pull request.');
    }
  };

  const slashItems = useMemo(() => getSlashItems(editor), [editor]);

  // Drop H4–H6 from the block-type dropdown — the serializer only emits h2–h4
  // (editor H1–H3), so deeper levels would silently collapse on the published site.
  const blockTypeItems = useMemo(
    () =>
      blockTypeSelectItems(editor.dictionary).filter(
        (item) =>
          !(item.type === 'heading' && !item.props?.isToggleable && Number(item.props?.level) > 3),
      ),
    [editor],
  );

  const handleSelectAll = (e: ReactKeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'a' || e.shiftKey || e.altKey) return;
    const view = editor.prosemirrorView;
    if (!view) return;
    const { state } = view;
    const { $from } = state.selection;
    const blockStart = $from.start($from.depth);
    const blockEnd = $from.end($from.depth);
    e.preventDefault();
    e.stopPropagation();
    const coversBlock =
      !state.selection.empty &&
      state.selection.from <= blockStart &&
      state.selection.to >= blockEnd;
    const next =
      blockStart === blockEnd || coversBlock
        ? new AllSelection(state.doc)
        : TextSelection.create(state.doc, blockStart, blockEnd);
    view.dispatch(state.tr.setSelection(next));
    view.focus();
  };

  return (
    <div className="write-portal">
      <div className="write-topbar">
        <button
          type="button"
          className="write-open-link"
          onClick={() => {
            setOpenError(null);
            setOpenDialog(true);
          }}
        >
          Edit a published post ↗
        </button>
      </div>

      {openDialog && (
        <div
          className="write-modal-backdrop"
          onClick={() => !busy && setOpenDialog(false)}
          role="presentation"
        >
          <div
            className="write-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit a published post"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Edit a published post</h3>
            <p>Paste the post’s URL.</p>
            <input
              type="text"
              className="write-open-url"
              placeholder="https://mlsystems.dev/blog/…"
              aria-label="Post URL"
              autoFocus
              value={openUrl}
              disabled={busy}
              onChange={(e) => setOpenUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void openExisting();
                }
              }}
            />
            {openError && <p className="write-modal-error">{openError}</p>}
            <div className="write-modal-actions">
              <button
                type="button"
                className="write-ghost"
                disabled={busy}
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="write-download"
                disabled={busy || !openUrl.trim()}
                onClick={() => void openExisting()}
              >
                {busy ? 'Loading…' : 'Open post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MetaForm
        authors={authors}
        topics={topics}
        meta={meta}
        images={images}
        onChange={(m) => {
          setMeta(m);
          autosave();
        }}
      />

      {currentTableId &&
        barPos &&
        (() => {
          const style = tableVariants[currentTableId] ?? DEFAULT_TABLE_STYLE;
          const setStyle = (patch: Partial<TableStyle>) => {
            setTableVariants((prev) => ({
              ...prev,
              [currentTableId]: { ...(prev[currentTableId] ?? DEFAULT_TABLE_STYLE), ...patch },
            }));
            autosave();
          };
          return (
            <div
              className="write-floating-bar"
              style={{ top: `${barPos.top}px`, left: `${barPos.left}px` }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span>Table</span>
              {BORDER_VARIANTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={style.border === v ? 'write-chip is-active' : 'write-chip'}
                  onClick={() => setStyle({ border: v })}
                >
                  {v}
                </button>
              ))}
              <span className="write-table-divider" aria-hidden="true" />
              <button
                type="button"
                className={style.zebra ? 'write-chip is-active' : 'write-chip'}
                onClick={() => setStyle({ zebra: !style.zebra })}
              >
                Zebra rows
              </button>
            </div>
          );
        })()}

      {restore && (
        <div className="write-banner">
          <span>You have an unsaved draft from {new Date(restore.savedAt).toLocaleString()}.</span>
          <div>
            <button type="button" onClick={acceptRestore}>
              Continue draft
            </button>
            <button type="button" className="write-ghost" onClick={discardRestore}>
              Start fresh
            </button>
          </div>
        </div>
      )}

      <style>{variantCss}</style>
      <div className="write-canvas" onKeyDownCapture={handleSelectAll}>
        <BlockNoteView
          editor={editor}
          theme={siteTheme}
          editable={!restore}
          slashMenu={false}
          formattingToolbar={false}
          onChange={autosave}
        >
          <FormattingToolbarController
            formattingToolbar={() => <FormattingToolbar blockTypeSelectItems={blockTypeItems} />}
          />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => filterSuggestionItems(slashItems, query)}
          />
        </BlockNoteView>
      </div>

      {issues.length > 0 && (
        <div className="write-issues">
          <strong>Before you download, fix these:</strong>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {sentFile && (
        <div className="write-done">
          <div className="write-done-head">
            <strong>Downloaded {sentFile} ✓</strong>
            <button type="button" className="write-ghost" onClick={() => setSentFile(null)}>
              Dismiss
            </button>
          </div>
          <p>
            That file is your whole post — text, images, everything we need to publish it. Here’s
            how to send it to us:
          </p>
          <div className="write-done-ways">
            <a
              className="write-download"
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                `New post: ${meta.title || 'Untitled'}`,
              )}&body=${encodeURIComponent(
                `Hi! I wrote a post for mlsystems.dev.\n\nBefore sending, please attach the folder I just downloaded (${sentFile}) — it's in your Downloads.\n\nTitle: ${meta.title}\nSummary: ${meta.summary}\n\nThanks!`,
              )}`}
            >
              Email it to us
            </a>
            <a className="write-done-alt" href={repoUrl} target="_blank" rel="noreferrer">
              Or open a pull request on GitHub →
            </a>
          </div>
          <p className="write-note-inline">
            Emailing? Attach the {sentFile} file — your browser saved it to your Downloads folder.
          </p>
        </div>
      )}

      <div className="write-actions">
        {storageOff && (
          <span className="write-note-inline">Autosave is off — your browser blocked storage.</span>
        )}
        <button type="button" className="write-ghost-btn" disabled={busy} onClick={download}>
          {busy ? 'Packaging…' : 'Download post'}
        </button>
        {githubEnabled && (
          <button type="button" className="write-download" disabled={busy} onClick={openPublish}>
            Post to GitHub →
          </button>
        )}
      </div>

      {publishOpen && (
        <div
          className="write-modal-backdrop"
          onClick={() => publishStage !== 'working' && setPublishOpen(false)}
          role="presentation"
        >
          <div
            className="write-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Post to GitHub"
            onClick={(e) => e.stopPropagation()}
          >
            {publishStage === 'done' ? (
              <>
                <h3>Your post has been submitted ✓</h3>
                <p>
                  Open the request and comment to claim it — that&rsquo;s how a maintainer knows
                  it&rsquo;s yours.
                </p>
                <div className="write-modal-actions">
                  {prUrl && (
                    <a className="write-download" href={prUrl} target="_blank" rel="noreferrer">
                      Open my request →
                    </a>
                  )}
                </div>
              </>
            ) : publishStage === 'working' ? (
              <>
                <h3>Opening your request…</h3>
                <div className="write-modal-loading">
                  <span className="write-spinner" aria-hidden="true" />
                  <p>Creating your pull request on GitHub. This only takes a moment.</p>
                </div>
              </>
            ) : (
              <>
                <h3>Ready to post?</h3>
                <p>
                  We’ll submit your article via GitHub. Once it’s created, just add your name on the
                  request to claim it — a maintainer takes it from there.
                </p>
                {publishError && (
                  <p className="write-modal-error" role="alert">
                    {publishError}
                  </p>
                )}
                <div className="write-modal-actions">
                  <button
                    type="button"
                    className="write-ghost"
                    onClick={() => setPublishOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="write-download"
                    onClick={() => void submitToGithub()}
                  >
                    Create pull request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
