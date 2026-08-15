import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  BORDER_VARIANTS,
  DEFAULT_TABLE_STYLE,
  collectImages,
  tableVariantCss,
} from './editor/docUtils';
import { OpenExistingDialog } from './dialogs/OpenExistingDialog';
import { PublishDialog, type PublishStage } from './dialogs/PublishDialog';
import { MetaForm, type Option } from './meta/MetaForm';
import { PreviewPane } from './preview/PreviewPane';
import { usePasteImages } from './editor/usePasteImages';
import { serializePost, type PostMeta, type SBlock, type TableStyle } from './serialize/toMdx';
import { slugify, suggest, validate } from './serialize/validate';
import { convertMdx } from './convert/mdxToSource.mjs';
import { buildZip } from './serialize/toZip';
import { buildSource, parseSource } from './serialize/source';
import { authorPath, buildAuthorJson } from './serialize/author';
import { fetchExisting, type LoadedSource } from './serialize/fetchExisting';
import {
  assemblePostFiles,
  createPullRequest,
  isConfigured as isGithubConfigured,
} from './publish/github';
import { allAssets, clearAssets, restoreAsset } from './storage/assets';
import { readPostZip } from './serialize/fromZip';
import {
  clearDraft,
  clearStoredAssets,
  loadDraft,
  restoreAssets,
  saveDraftDebounced,
} from './storage/drafts';
import './editor/editor-theme.css';

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
    ogCard: false,
    draft: false,
    proposedTopic: '',
    newAuthor: null,
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
  const [autoLoading, setAutoLoading] = useState(false);
  const [sentFile, setSentFile] = useState<string | null>(null);
  const [siteTheme, setSiteTheme] = useState<'light' | 'dark'>('light');
  const [openError, setOpenError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [convertible, setConvertible] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [wantsPublish, setWantsPublish] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [openUrl, setOpenUrl] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const githubEnabled = isGithubConfigured();
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStage, setPublishStage] = useState<PublishStage>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Single place for the BlockNote → serializer block-shape cast.
  const docBlocks = useCallback(() => editor.document as unknown as SBlock[], [editor]);

  const bylineNames =
    meta.authors
      .map((id) => authors.find((a) => a.id === id)?.name ?? id)
      .filter(Boolean)
      .join(', ') ||
    meta.writerName ||
    'You';

  const variantCss = useMemo(() => tableVariantCss(tableVariants), [tableVariants]);
  const images = useMemo(() => collectImages(docBlocks()), [docBlocks, editor.document]);

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
    // A deep-link edit (?edit=slug) loads that post instead — skip the restore prompt.
    if (new URLSearchParams(window.location.search).get('edit')) return;
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
      blocks: docBlocks(),
      tableVariants,
      savedAt: Date.now(),
    }),
    [editor, meta, tableVariants],
  );

  const autosave = useCallback(() => {
    if (restore) return;
    setSentFile(null);
    if (isEmptyDraft(meta, docBlocks())) return;
    saveDraftDebounced(getDraft, () => setStorageOff(true));
  }, [getDraft, restore, editor, meta]);

  usePasteImages(editor, autosave);

  const continueWriting = () => {
    const doc = editor.document;
    const last = doc[doc.length - 1];
    const lastIsEmptyParagraph =
      last.type === 'paragraph' && (!Array.isArray(last.content) || last.content.length === 0);
    const target = lastIsEmptyParagraph
      ? last
      : (editor.insertBlocks([{ type: 'paragraph' }], last, 'after')[0] ?? last);
    editor.setTextCursorPosition(target, 'end');
    editor.focus();
  };

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

  const applySource = async (loaded: LoadedSource) => {
    clearAssets();
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
    setLoadNotice(loaded.notice ?? null);
  };

  const openExisting = async () => {
    const input = openUrl.trim();
    if (!input) return;
    setOpenError(null);
    setBusy(true);
    try {
      const loaded = await fetchExisting(repoUrl, input);
      await applySource(loaded);
      setLoadedSlug(loaded.meta.slug || null);
      setOpenUrl('');
      setOpenDialog(false);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'That post could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  // Deep link from a published post's "Improve" button: /write?edit=<slug>.
  // Load that post straight into the editor, then drop the param so a refresh
  // doesn't reload it over later edits.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('edit');
    if (!slug) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    (async () => {
      setBusy(true);
      setAutoLoading(true);
      setOpenError(null);
      try {
        const loaded = await fetchExisting(repoUrl, slug);
        await applySource(loaded);
        setLoadedSlug(loaded.meta.slug || null);
      } catch (err) {
        setOpenError(err instanceof Error ? err.message : 'That post could not be opened.');
        setOpenUrl(slug);
        setOpenDialog(true);
      } finally {
        setBusy(false);
        setAutoLoading(false);
      }
    })();
  }, []);

  // Arriving from a draft's Publish button: /write?edit=<slug>&publish=1 opens
  // the post, unticks the draft box and scrolls to the actions, so publishing is
  // one click from where the reader started.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('publish') !== '1') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('publish');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    setWantsPublish(true);
  }, []);

  // Runs once the deep-linked post has finished loading — applySource would
  // otherwise overwrite the untick with the draft flag read from frontmatter.
  useEffect(() => {
    if (!wantsPublish || autoLoading || !loadedSlug) return;
    setWantsPublish(false);
    setMeta((m) => ({ ...m, draft: false }));
    actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [wantsPublish, autoLoading, loadedSlug]);

  const uploadPostZip = async (file: File) => {
    setUploadError(null);
    setConvertible(null);
    try {
      const { parsed, assets } = await readPostZip(file);
      if (
        !isEmptyDraft(meta, docBlocks()) &&
        !window.confirm('Replace your current draft with the uploaded post?')
      )
        return;
      await applySource(parsed);
      for (const a of assets) restoreAsset(a.name, a.file);
      setLoadedSlug(null);
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message ? err.message : 'That ZIP could not be opened.',
      );
    }
  };

  const uploadSourceFile = async (file: File) => {
    if (/\.zip$/i.test(file.name)) return uploadPostZip(file);
    setUploadError(null);
    setConvertible(null);
    try {
      const text = await file.text();
      if (/\.mdx?$/i.test(file.name)) return convertAndLoad(text);
      const parsed = parseSource(text);
      if (!parsed) {
        setUploadError('Not a valid write-source .json file.');
        if (/^---\n[\s\S]*?\n---\n/.test(text)) {
          setConvertible(text);
        }
        return;
      }
      if (
        !isEmptyDraft(meta, docBlocks()) &&
        !window.confirm('Replace your current draft with the uploaded file?')
      )
        return;
      await applySource(parsed);
      setLoadedSlug(null);
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message
          ? `Could not load that file: ${err.message}`
          : 'Could not load that file — its blocks may not match the editor schema.',
      );
    }
  };

  const convertAndLoad = async (text: string) => {
    try {
      const { doc } = convertMdx(text);
      doc.meta.slug = slugify(doc.meta.title) || 'post-slug';
      if (
        !isEmptyDraft(meta, docBlocks()) &&
        !window.confirm('Replace your current draft with the converted post?')
      )
        return;
      await applySource(doc);
      setLoadedSlug(null);
      setUploadError(null);
      setConvertible(null);
    } catch {
      setUploadError('That post could not be converted — some of it uses unsupported markup.');
      setConvertible(null);
    }
  };

  const convertUpload = async () => {
    if (convertible) await convertAndLoad(convertible);
  };

  const download = async () => {
    const blocks = docBlocks();
    const found = [...validate(meta, blocks), ...oversizedIssues()];
    setIssues(found);
    if (found.length > 0) return;
    setBusy(true);
    try {
      const serialized = serializePost(meta, blocks, { tableVariants, today: new Date() });
      const blob = await buildZip({
        serialized,
        slug: meta.slug,
        assets: allAssets(),
        sourceJson: buildSource(meta, blocks, tableVariants),
        newAuthor: meta.newAuthor ?? null,
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
    const blocks = docBlocks();
    const found = [...validate(meta, blocks), ...oversizedIssues()];
    setIssues(found);
    if (found.length > 0) return;
    setSuggestions(suggest(meta));
    setPublishError(null);
    setPrUrl(null);
    setPublishStage('idle');
    setPublishOpen(true);
  };

  const submitToGithub = async () => {
    const blocks = docBlocks();
    setPublishStage('working');
    setPublishError(null);
    try {
      const serialized = serializePost(meta, blocks, { tableVariants, today: new Date() });
      const sourceJson = buildSource(meta, blocks, tableVariants);
      const files = await assemblePostFiles(meta.slug, serialized, sourceJson, allAssets());
      if (meta.newAuthor?.handle) {
        files.push({
          path: authorPath(meta.newAuthor.handle),
          content: buildAuthorJson(meta.newAuthor),
          encoding: 'utf-8',
        });
      }
      const pr = await createPullRequest({
        slug: meta.slug,
        title: meta.title || 'Untitled',
        summary: meta.summary,
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
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
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
      {autoLoading && (
        <div className="write-autoloading" role="status">
          Loading the post into the editor…
        </div>
      )}
      {loadNotice && (
        <div className="write-load-notice" role="status">
          <span>{loadNotice}</span>
          <button type="button" onClick={() => setLoadNotice(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      <div className="write-topbar">
        <input
          ref={uploadInputRef}
          type="file"
          accept=".json,.zip,.mdx,.md,application/json,application/zip"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void uploadSourceFile(file);
          }}
        />
        <span className="write-upload-group">
          <button
            type="button"
            className="write-open-link"
            onClick={() => uploadInputRef.current?.click()}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 15V4M7 8l5-4 5 4" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            Upload post
          </button>
          <span
            className="write-info"
            tabIndex={0}
            data-tip="Takes a post .json, a Markdown file, or a downloaded post ZIP."
            aria-label="Takes a post .json, a Markdown file, or a downloaded post ZIP."
          >
            i
          </span>
        </span>
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
      {uploadError && (
        <p className="write-upload-error">
          {uploadError}
          {convertible && (
            <>
              {' '}
              Looks like a published post, though.
              <button type="button" className="write-chip" onClick={() => void convertUpload()}>
                Convert &amp; load
              </button>
            </>
          )}
        </p>
      )}

      <OpenExistingDialog
        open={openDialog}
        busy={busy}
        url={openUrl}
        error={openError}
        onUrlChange={setOpenUrl}
        onSubmit={() => void openExisting()}
        onClose={() => setOpenDialog(false)}
      />

      {!previewOn && (
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
      )}

      {previewOn && (
        <PreviewPane
          meta={meta}
          blocks={docBlocks()}
          tableVariants={tableVariants}
          byline={bylineNames}
        />
      )}

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
              onMouseDown={(e) => {
                if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
              }}
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
              <span className="write-table-divider" aria-hidden="true" />
              <input
                type="text"
                className="write-table-caption"
                placeholder="Caption (optional)"
                value={style.caption ?? ''}
                onChange={(e) => setStyle({ caption: e.target.value })}
              />
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
      <div
        className="write-canvas"
        style={previewOn ? { display: 'none' } : undefined}
        onKeyDownCapture={handleSelectAll}
      >
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
        {!restore && (
          <button type="button" className="write-continue" onClick={continueWriting}>
            ＋ Continue writing — or type &lsquo;/&rsquo; for blocks
          </button>
        )}
      </div>

      <div className="write-preview-toggle-row">
        <button type="button" className="write-preview-btn" onClick={() => setPreviewOn((v) => !v)}>
          {previewOn ? '✕ Back to writing' : '◉ Preview'}
        </button>
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
            That file is your whole post — text, images, everything.{' '}
            <strong>Keep it to draft and continue later</strong> (upload it with the Upload post
            button), or send it to us now:
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
          </div>
          <p className="write-note-inline">
            Emailing? Attach the {sentFile} file — your browser saved it to your Downloads folder.
          </p>
        </div>
      )}

      <div
        className="write-actions"
        ref={actionsRef}
        style={previewOn ? { display: 'none' } : undefined}
      >
        {storageOff && (
          <span className="write-note-inline">Autosave is off — your browser blocked storage.</span>
        )}
        <label
          className="write-draft-toggle"
          title="Builds and stays at its real URL, but is left out of every listing, the sitemap and search."
        >
          <input
            type="checkbox"
            checked={!!meta.draft}
            onChange={(e) => setMeta({ ...meta, draft: e.target.checked })}
          />
          Keep as draft
        </label>
        <button type="button" className="write-ghost-btn" disabled={busy} onClick={download}>
          {busy ? 'Packaging…' : 'Download post'}
        </button>
        {githubEnabled && (
          <button type="button" className="write-download" disabled={busy} onClick={openPublish}>
            <svg
              className="write-btn-icon"
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            Submit post
          </button>
        )}
      </div>
      {githubEnabled && (
        <p className="write-actions-note" style={previewOn ? { display: 'none' } : undefined}>
          NOTE: Post is submitted as a pull request on GitHub for review.
        </p>
      )}
      <p className="write-actions-note" style={previewOn ? { display: 'none' } : undefined}>
        Not done yet? Wanna Draft? Download your post and upload it here later to continue.
      </p>

      <PublishDialog
        open={publishOpen}
        stage={publishStage}
        error={publishError}
        prUrl={prUrl}
        suggestions={suggestions}
        onSubmit={() => void submitToGithub()}
        onClose={() => setPublishOpen(false)}
      />
    </div>
  );
}
