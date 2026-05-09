import { useMemo } from 'react';
import { marked } from 'marked';
import styles from './MarkdownRenderer.module.css';

marked.setOptions({ gfm: true, breaks: true });

export function MarkdownRenderer({ markdown }) {
  const html = useMemo(() => {
    const src = markdown || '';
    return marked.parse(src);
  }, [markdown]);

  return <div className={styles.md} dangerouslySetInnerHTML={{ __html: html }} />;
}
