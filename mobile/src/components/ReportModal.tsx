import React, {useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {tokens} from '../theme/tokens';
import {BASE_URL} from '../config';

const REASONS = [
  {key: 'inappropriate', label: 'Inappropriate content'},
  {key: 'inaccurate', label: 'Inaccurate or misleading'},
  {key: 'harmful', label: 'Harmful or offensive'},
  {key: 'other', label: 'Something else'},
] as const;

type Reason = (typeof REASONS)[number]['key'];

const REPORT_URL = `${BASE_URL}/api/report`;

interface Props {
  visible: boolean;
  onClose: () => void;
}

type State = 'idle' | 'sending' | 'done' | 'error';

function FeedbackView({title, body, buttonLabel, onClose}: {
  title: string;
  body: string;
  buttonLabel: string;
  onClose: () => void;
}) {
  return (
    <View
      style={styles.feedback}
      accessible={true}
      accessibilityLabel={`${title}. ${body}`}
      accessibilityLiveRegion="assertive">
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackBody}>{body}</Text>
      <Pressable style={styles.btnPrimary} onPress={onClose}>
        <Text style={styles.btnPrimaryText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

export function ReportModal({visible, onClose}: Props) {
  const [selected, setSelected] = useState<Reason | null>(null);
  const [state, setState] = useState<State>('idle');

  function handleClose() {
    setSelected(null);
    setState('idle');
    onClose();
  }

  async function handleSend() {
    if (!selected) return;
    setState('sending');
    try {
      await fetch(REPORT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({reason: selected}),
        signal: AbortSignal.timeout(10_000),
      });
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal>
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityLabel="Dismiss report dialog"
        accessibilityHint="Double tap to close without submitting"
        accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={() => {}}>
          {state === 'done' ? (
            <FeedbackView
              title="Thanks for the report"
              body="We'll review this and use it to improve the app."
              buttonLabel="Done"
              onClose={handleClose}
            />
          ) : state === 'error' ? (
            <FeedbackView
              title="Couldn't send report"
              body="Check your connection and try again."
              buttonLabel="Close"
              onClose={handleClose}
            />
          ) : (
            <>
              <Text style={styles.title}>Report a problem</Text>
              <Text style={styles.subtitle}>What's wrong with this output?</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Reason for report">
                {REASONS.map(r => (
                  <Pressable
                    key={r.key}
                    style={[styles.option, selected === r.key && styles.optionSelected]}
                    onPress={() => setSelected(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{checked: selected === r.key}}
                    accessibilityLabel={r.label}>
                    <View
                      style={[
                        styles.radio,
                        selected === r.key && styles.radioSelected,
                      ]}
                    />
                    <Text style={styles.optionText}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.btnSecondary} onPress={handleClose}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimary, !selected && styles.btnDisabled]}
                  onPress={handleSend}
                  disabled={!selected || state === 'sending'}
                  accessibilityState={{disabled: !selected || state === 'sending'}}
                  accessibilityLabel={
                    state === 'sending' ? 'Sending…' :
                    !selected ? 'Select a reason first' :
                    'Send report'
                  }>
                  {state === 'sending' ? (
                    <ActivityIndicator color={tokens.bg} size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Send</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  title: {
    color: tokens.fg,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: tokens.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: tokens.radiusCard,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  optionSelected: {
    borderColor: tokens.yellow,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: tokens.muted,
  },
  radioSelected: {
    borderColor: tokens.yellow,
    backgroundColor: tokens.yellow,
  },
  optionText: {
    color: tokens.fg,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: tokens.yellow,
    borderRadius: tokens.radiusCard,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: tokens.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    borderRadius: tokens.radiusCard,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: tokens.muted,
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  feedback: {
    gap: 10,
    paddingVertical: 8,
  },
  feedbackTitle: {
    color: tokens.fg,
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackBody: {
    color: tokens.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
