import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AllSelection, TextSelection } from 'prosemirror-state';
import { filterSuggestionItems } from '@blocknote/core';
import {
  SuggestionMenuController,
  useCreateBlockNote,
  useEditorSelectionChange,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { schema } from './editor/schema';
import { getSlashItems } from './editor/slashMenu';
import { MetaForm, type Option } from './meta/MetaForm';
import { serializePost, type PostMeta, type SBlock, type TableStyle } from './serialize/toMdx';
import { validate } from './serialize/validate';
import { buildZip } from './serialize/toZip';
import { allAssets } from './storage/assets';
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

function isEmptyDraft(meta: PostMeta, blocks: SBlock[]): boolean {
  const metaEmpty =
    !meta.title.trim() && !meta.summary.trim() && !meta.slug.trim() && meta.tags.length === 0;
  const blocksEmpty = blocks.every(
    (b) => b.type === 'paragraph' && (!Array.isArray(b.content) || b.content.length === 0),
  );
  return metaEmpty && blocksEmpty;
}

function emptyMeta(defaultAuthor: string): PostMeta {
  return {
    title: '',
    summary: '',
    author: defaultAuthor,
    writerName: '',
    topicId: '',
    topicName: '',
    tags: [],
    slug: '',
    coverFileName: '',
  };
}

export default function WritePortal({ authors, topics, repoUrl, contactEmail }: Props) {
  const editor = useCreateBlockNote({ schema });
  const [meta, setMeta] = useState<PostMeta>(() => emptyMeta(authors[0]?.id ?? 'guest'));
  const [tableVariants, setTableVariants] = useState<Record<string, TableStyle>>({});
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [barPos, setBarPos] = useState<{ top: number; left: number } | null>(null);
  const [restore, setRestore] = useState<null | { savedAt: number }>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [storageOff, setStorageOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentFile, setSentFile] = useState<string | null>(null);
  const [siteTheme, setSiteTheme] = useState<'light' | 'dark'>('light');

  const variantCss = useMemo(() => tableVariantCss(tableVariants), [tableVariants]);

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
      setMeta(draft.meta);
      setTableVariants(draft.tableVariants ?? {});
    }
    setRestore(null);
  };

  const discardRestore = async () => {
    clearDraft();
    await clearStoredAssets().catch(() => undefined);
    setRestore(null);
  };

  const download = async () => {
    const blocks = editor.document as unknown as SBlock[];
    const found = validate(meta, blocks);
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
        assets: allAssets(),
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

  const slashItems = useMemo(() => getSlashItems(editor), [editor]);

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
      <MetaForm
        authors={authors}
        topics={topics}
        meta={meta}
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
          onChange={autosave}
        >
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
        <button type="button" className="write-download" disabled={busy} onClick={download}>
          {busy ? 'Packaging…' : 'Download post folder'}
        </button>
      </div>
    </div>
  );
}
