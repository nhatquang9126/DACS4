import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface MarkdownRendererProps {
  content: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Lỗi chép mã nguồn:', e);
    }
  };

  const displayLang = (language || 'code').toUpperCase();

  return (
    <View style={styles.codeContainer}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{displayLang}</Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          {copied ? (
            <>
              <Check size={14} color="#10B981" />
              <Text style={[styles.copyText, { color: '#10B981' }]}>Đã chép</Text>
            </>
          ) : (
            <>
              <Copy size={14} color="#94A3B8" />
              <Text style={styles.copyText}>Sao chép</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.codeScroll}>
        <Text style={styles.codeText}>{code}</Text>
      </ScrollView>
    </View>
  );
};

// Helper parse inline markdown: **bold**, `code`, *italic*
const renderFormattedText = (rawText: string, baseStyle: any = styles.paragraphText) => {
  if (!rawText) return null;

  // Regex matches `inline code` OR **bold** OR *italic*
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = rawText.split(regex);

  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Inline code
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          const codeVal = part.slice(1, -1);
          return (
            <Text key={index} style={styles.inlineCode}>
              {codeVal}
            </Text>
          );
        }

        // Bold
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          const boldVal = part.slice(2, -2);
          return (
            <Text key={index} style={styles.boldText}>
              {boldVal}
            </Text>
          );
        }

        // Italic
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          const italicVal = part.slice(1, -1);
          return (
            <Text key={index} style={styles.italicText}>
              {italicVal}
            </Text>
          );
        }

        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines into blocks, keeping track of code fences
  const lines = content.split('\n');
  const blocks: Array<{
    type: 'header1' | 'header2' | 'header3' | 'code' | 'bullet' | 'number' | 'quote' | 'paragraph';
    text: string;
    lang?: string;
    num?: string;
  }> = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fence detection
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push({
          type: 'code',
          text: codeBuffer.join('\n'),
          lang: codeLang,
        });
        codeBuffer = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
        codeLang = trimmed.replace('```', '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Empty lines
    if (!trimmed) {
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'header3', text: trimmed.replace('### ', '') });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'header2', text: trimmed.replace('## ', '') });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'header1', text: trimmed.replace('# ', '') });
    } else if (trimmed.startsWith('> ') || trimmed === '>') {
      // Blockquote / callout
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s?/, '') });
    } else if (trimmed.match(/^(\*|-)\s+/)) {
      // Bullet list item
      blocks.push({
        type: 'bullet',
        text: trimmed.replace(/^(\*|-)\s+/, ''),
      });
    } else if (trimmed.match(/^\d+\.\s+/)) {
      // Numbered list item
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        blocks.push({
          type: 'number',
          num: numMatch[1],
          text: numMatch[2],
        });
      } else {
        blocks.push({ type: 'paragraph', text: trimmed });
      }
    } else {
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }

  // Flush dangling code block if unclosed
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      type: 'code',
      text: codeBuffer.join('\n'),
      lang: codeLang,
    });
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'header1':
            return (
              <View key={idx} style={styles.h1Container}>
                {renderFormattedText(block.text, styles.h1Text)}
              </View>
            );
          case 'header2':
            return (
              <View key={idx} style={styles.h2Container}>
                {renderFormattedText(block.text, styles.h2Text)}
              </View>
            );
          case 'header3':
            return (
              <View key={idx} style={styles.h3Container}>
                {renderFormattedText(block.text, styles.h3Text)}
              </View>
            );
          case 'code':
            return <CodeBlock key={idx} language={block.lang || 'code'} code={block.text} />;
          case 'quote':
            return (
              <View key={idx} style={styles.quoteContainer}>
                <View style={styles.quoteBar} />
                <View style={styles.quoteContent}>
                  {renderFormattedText(block.text, styles.quoteText)}
                </View>
              </View>
            );
          case 'bullet':
            return (
              <View key={idx} style={styles.listItemRow}>
                <View style={styles.bulletDot} />
                <View style={styles.listTextContainer}>
                  {renderFormattedText(block.text, styles.listItemText)}
                </View>
              </View>
            );
          case 'number':
            return (
              <View key={idx} style={styles.listItemRow}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>{block.num}</Text>
                </View>
                <View style={styles.listTextContainer}>
                  {renderFormattedText(block.text, styles.listItemText)}
                </View>
              </View>
            );
          case 'paragraph':
          default:
            return (
              <View key={idx} style={styles.paragraphContainer}>
                {renderFormattedText(block.text, styles.paragraphText)}
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  h1Container: {
    marginTop: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  h1Text: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  h2Container: {
    marginTop: 10,
    marginBottom: 4,
  },
  h2Text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
  },
  h3Container: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  h3Text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81',
    lineHeight: 20,
  },
  paragraphContainer: {
    marginVertical: 3,
  },
  paragraphText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  italicText: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 13,
    fontWeight: '600',
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  codeLanguage: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  copyText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  codeScroll: {
    padding: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#F8FAFC',
    lineHeight: 19,
  },
  quoteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quoteBar: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  quoteContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quoteText: {
    fontSize: 13.5,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    marginRight: 8,
  },
  numberBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 8,
  },
  numberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
});

