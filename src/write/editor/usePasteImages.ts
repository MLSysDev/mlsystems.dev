import { useEffect } from 'react';
import type { WriteEditor } from './schema';
import { addAsset } from '../storage/assets';
import { optimizeImage } from '../storage/optimizeImage';

// Pasting an image (e.g. a screenshot) into the editor inserts it as a figure
// block, running through the same optimize + asset pipeline as file uploads.
export function usePasteImages(editor: WriteEditor, onInserted: () => void): void {
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.bn-editor')) return;
      // Block-embedded fields (captions, alt text, SVG code) keep native paste.
      if (target.closest('input, textarea')) return;
      const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        const names: string[] = [];
        for (const file of images) names.push(addAsset(await optimizeImage(file)));
        editor.insertBlocks(
          names.map((fileName) => ({ type: 'figure' as const, props: { fileName } })),
          editor.getTextCursorPosition().block,
          'after',
        );
        onInserted();
      })();
    }
    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, [editor, onInserted]);
}
