import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { serializePost, type PostMeta, type SBlock } from './serialize/toMdx';
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

const TABLE_VARIANTS = ['rule', 'zebra', 'lined', 'plain'];

type Props = {
  authors: Option[];
  topics: Option[];
  repoUrl: string;
};

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

export default function WritePortal({ authors, topics, repoUrl }: Props) {
  const editor = useCreateBlockNote({ schema });
  const [meta, setMeta] = useState<PostMeta>(() => emptyMeta(authors[0]?.id ?? 'guest'));
  const [tableVariants, setTableVariants] = useState<Record<string, string>>({});
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [restore, setRestore] = useState<null | { savedAt: number }>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [storageOff, setStorageOff] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setRestore({ savedAt: draft.savedAt });
  }, []);

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
    saveDraftDebounced(getDraft, () => setStorageOff(true));
  }, [getDraft, restore]);

  useEditorSelectionChange(() => {
    const block = editor.getTextCursorPosition().block;
    setCurrentTableId(block?.type === 'table' ? block.id : null);
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
    } finally {
      setBusy(false);
    }
  };

  const slashItems = useMemo(() => getSlashItems(editor), [editor]);

  return (
    <div className="write-portal">
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

      <MetaForm
        authors={authors}
        topics={topics}
        meta={meta}
        onChange={(m) => {
          setMeta(m);
          autosave();
        }}
      />

      {currentTableId && (
        <div className="write-table-bar">
          <span>Table style</span>
          {TABLE_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              className={
                (tableVariants[currentTableId] ?? 'rule') === v
                  ? 'write-chip is-active'
                  : 'write-chip'
              }
              onClick={() => {
                setTableVariants((prev) => ({ ...prev, [currentTableId]: v }));
                autosave();
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <BlockNoteView editor={editor} slashMenu={false} onChange={autosave}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => filterSuggestionItems(slashItems, query)}
        />
      </BlockNoteView>

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
